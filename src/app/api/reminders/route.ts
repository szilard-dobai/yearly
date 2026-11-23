import { isAccountsEnabled } from '@/lib/auth/enabled'
import { getSessionEmail } from '@/lib/auth/session-user'
import { getRemindersCollection, type ReminderDocument } from '@/lib/mongodb'
import { REMINDER_DATE_LABEL } from '@/lib/reminders/date'
import { getReminderTotals, isOpenReminderYear } from '@/lib/reminders/server'
import { notifyReminderToSlack } from '@/lib/reminders/slack'
import { createReminderSchema } from '@/lib/reminders/types'
import { validateSameOrigin } from '@/lib/tracking/api'
import { MongoServerError } from 'mongodb'
import { after, NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 4 * 1024
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT_MAX_SIGNUPS = 5
const NO_STORE = { 'Cache-Control': 'no-store' }

const yearSchema = z.coerce.number().int().min(2000).max(2200)

async function getAccountReminder(request: Request) {
  if (!isAccountsEnabled()) {
    return { error: new NextResponse(null, { status: 404 }) }
  }
  const year = yearSchema.safeParse(
    new URL(request.url).searchParams.get('year')
  )
  if (!year.success) {
    return {
      error: NextResponse.json({ error: 'Invalid request' }, { status: 400 }),
    }
  }
  const email = await getSessionEmail(request)
  if (!email) {
    return {
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }
  return { year: year.data, email }
}

export async function GET(request: Request) {
  const reminder = await getAccountReminder(request)
  if (reminder.error) return reminder.error

  try {
    const collection = await getRemindersCollection()
    const set =
      (await collection.countDocuments(
        { year: reminder.year, email: reminder.email },
        { limit: 1 }
      )) > 0
    return NextResponse.json({ set }, { headers: NO_STORE })
  } catch (error) {
    console.error('Failed to read the reminder:', error)
    return NextResponse.json(
      { error: 'Failed to read the reminder' },
      { status: 500, headers: NO_STORE }
    )
  }
}

export async function DELETE(request: Request) {
  const forbidden = validateSameOrigin(request)
  if (forbidden) return forbidden

  const reminder = await getAccountReminder(request)
  if (reminder.error) return reminder.error

  try {
    const collection = await getRemindersCollection()
    await collection.deleteOne({ year: reminder.year, email: reminder.email })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to turn off the reminder:', error)
    return NextResponse.json(
      { error: 'Failed to turn off the reminder' },
      { status: 500 }
    )
  }
}

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

  const parsed = createReminderSchema.safeParse(body)
  if (!parsed.success) {
    const emailIssue = parsed.error.issues.some((i) => i.path[0] === 'email')
    return NextResponse.json(
      {
        error: emailIssue
          ? 'Please enter a valid email address'
          : 'Invalid request',
      },
      { status: 400 }
    )
  }

  const { deviceId, year, deviceType } = parsed.data
  if (!isOpenReminderYear(year)) {
    const closed = year === new Date().getUTCFullYear()
    return NextResponse.json(
      {
        error: closed
          ? `Reminders for ${year} closed on ${REMINDER_DATE_LABEL}`
          : 'Invalid request',
      },
      { status: 400 }
    )
  }

  const email = (await getSessionEmail(request)) ?? parsed.data.email

  try {
    const collection = await getRemindersCollection()

    const recentSignups = await collection.countDocuments({
      deviceId,
      createdAt: { $gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
    })
    if (recentSignups >= RATE_LIMIT_MAX_SIGNUPS) {
      return NextResponse.json(
        { error: 'Too many sign-ups, please try again later' },
        { status: 429 }
      )
    }

    const now = new Date()
    const latest: Partial<ReminderDocument> = { updatedAt: now }
    if (deviceType) latest.deviceType = deviceType
    const country = request.headers.get('x-vercel-ip-country')
    const region = request.headers.get('x-vercel-ip-country-region')
    if (country) latest.country = country
    if (region) latest.region = region

    const result = await collection.updateOne(
      { year, email },
      { $set: latest, $setOnInsert: { deviceId, createdAt: now } },
      { upsert: true }
    )

    if (result.upsertedCount > 0) {
      after(async () =>
        notifyReminderToSlack(
          { ...latest, method: 'email' },
          await getReminderTotals(year)
        )
      )
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return NextResponse.json({ success: true }, { status: 201 })
    }
    console.error('Failed to save reminder:', error)
    return NextResponse.json(
      { error: 'Failed to save reminder' },
      { status: 500 }
    )
  }
}
