import { getWaitlistCollection, type WaitlistDocument } from '@/lib/mongodb'
import { validateSameOrigin } from '@/lib/tracking/api'
import { notifyWaitlistToSlack } from '@/lib/waitlist/slack'
import { joinWaitlistSchema } from '@/lib/waitlist/types'
import { MongoServerError } from 'mongodb'
import { after, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 4 * 1024
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT_MAX_SIGNUPS = 5

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

  const parsed = joinWaitlistSchema.safeParse(body)
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

  const { email, deviceId, feature, context, deviceType } = parsed.data

  try {
    const collection = await getWaitlistCollection()

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
    const latest: Partial<WaitlistDocument> = { updatedAt: now }
    if (context && Object.keys(context).length > 0) latest.context = context
    if (deviceType) latest.deviceType = deviceType
    const country = request.headers.get('x-vercel-ip-country')
    const region = request.headers.get('x-vercel-ip-country-region')
    if (country) latest.country = country
    if (region) latest.region = region

    const result = await collection.updateOne(
      { feature, email },
      { $set: latest, $setOnInsert: { deviceId, createdAt: now } },
      { upsert: true }
    )

    if (result.upsertedCount > 0) {
      after(async () =>
        notifyWaitlistToSlack(
          latest,
          await collection.countDocuments({ feature })
        )
      )
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      return NextResponse.json({ success: true }, { status: 201 })
    }
    console.error('Failed to join waitlist:', error)
    return NextResponse.json(
      { error: 'Failed to join waitlist' },
      { status: 500 }
    )
  }
}
