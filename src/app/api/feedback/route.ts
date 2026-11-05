import {
  buildFeedbackFilter,
  buildFeedbackListPipeline,
} from '@/lib/feedback/query'
import { notifyFeedbackToSlack } from '@/lib/feedback/slack'
import {
  createFeedbackSchema,
  feedbackListQuerySchema,
} from '@/lib/feedback/types'
import { type FeedbackDocument, getFeedbackCollection } from '@/lib/mongodb'
import { requireAdmin, validateSameOrigin } from '@/lib/tracking/api'
import { after, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_BODY_BYTES = 16 * 1024
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT_MAX_SUBMISSIONS = 10
const MAX_USER_AGENT_LENGTH = 500

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

  const parsed = createFeedbackSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid feedback' },
      { status: 400 }
    )
  }

  const { deviceId, rating, message, source, context, deviceType } = parsed.data

  try {
    const collection = await getFeedbackCollection()

    const recentSubmissions = await collection.countDocuments({
      deviceId,
      createdAt: { $gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS) },
    })
    if (recentSubmissions >= RATE_LIMIT_MAX_SUBMISSIONS) {
      return NextResponse.json(
        { error: 'Too many submissions, please try again later' },
        { status: 429 }
      )
    }

    const now = new Date()
    const document: FeedbackDocument = {
      deviceId,
      rating: rating ?? null,
      message: message || null,
      source,
      createdAt: now,
      updatedAt: now,
    }

    const userAgent = request.headers.get('user-agent')
    const country = request.headers.get('x-vercel-ip-country')
    const region = request.headers.get('x-vercel-ip-country-region')

    if (context && Object.keys(context).length > 0) document.context = context
    if (deviceType) document.deviceType = deviceType
    if (userAgent)
      document.userAgent = userAgent.slice(0, MAX_USER_AGENT_LENGTH)
    if (country) document.country = country
    if (region) document.region = region

    const result = await collection.insertOne(document)
    after(() => notifyFeedbackToSlack(document, 'created'))

    return NextResponse.json(
      { id: result.insertedId.toHexString() },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to save feedback:', error)
    return NextResponse.json(
      { error: 'Failed to save feedback' },
      { status: 500 }
    )
  }
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  const url = new URL(request.url)
  const parsed = feedbackListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams)
  )
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query' }, { status: 400 })
  }

  const query = parsed.data

  try {
    const collection = await getFeedbackCollection()

    const [feedback, total] = await Promise.all([
      collection.aggregate(buildFeedbackListPipeline(query)).toArray(),
      collection.countDocuments(buildFeedbackFilter(query)),
    ])

    return NextResponse.json({
      feedback,
      total,
      hasMore: query.offset + feedback.length < total,
    })
  } catch (error) {
    console.error('Failed to fetch feedback:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
      { status: 500 }
    )
  }
}
