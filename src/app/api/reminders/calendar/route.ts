import {
  type CalendarReminderDocument,
  getCalendarRemindersCollection,
} from '@/lib/mongodb'
import { getReminderTotals, isOpenReminderYear } from '@/lib/reminders/server'
import { notifyReminderToSlack } from '@/lib/reminders/slack'
import { addCalendarReminderSchema } from '@/lib/reminders/types'
import { validateSameOrigin } from '@/lib/tracking/api'
import { MongoServerError } from 'mongodb'
import { after, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 1024
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT_MAX_ADDS = 2

export async function POST(request: Request) {
  const forbidden = validateSameOrigin(request)
  if (forbidden) return forbidden

  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
  }

  let body: unknown
  try {
    const text = await request.text()
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: 'Payload too large' }, { status: 413 })
    }
    body = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = addCalendarReminderSchema.safeParse(body)
  if (!parsed.success || !isOpenReminderYear(parsed.data.year)) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { deviceId, year, provider, deviceType } = parsed.data

  try {
    const collection = await getCalendarRemindersCollection()

    const recentAdds = await collection.countDocuments({
      deviceId,
      createdAt: { $gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
    })
    if (recentAdds >= RATE_LIMIT_MAX_ADDS) {
      return NextResponse.json(
        { error: 'Too many requests, please try again later' },
        { status: 429 }
      )
    }

    const now = new Date()
    const latest: Partial<CalendarReminderDocument> = { updatedAt: now }
    if (deviceType) latest.deviceType = deviceType
    const country = request.headers.get('x-vercel-ip-country')
    const region = request.headers.get('x-vercel-ip-country-region')
    if (country) latest.country = country
    if (region) latest.region = region

    const result = await collection.updateOne(
      { deviceId, year, provider },
      { $set: latest, $setOnInsert: { createdAt: now } },
      { upsert: true }
    )

    if (result.upsertedCount > 0) {
      after(async () =>
        notifyReminderToSlack(
          { ...latest, method: provider },
          await getReminderTotals(year)
        )
      )
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return NextResponse.json({ success: true }, { status: 201 })
    }
    console.error('Failed to save calendar reminder:', error)
    return NextResponse.json(
      { error: 'Failed to save calendar reminder' },
      { status: 500 }
    )
  }
}
