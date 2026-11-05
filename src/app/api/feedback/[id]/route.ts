import { notifyFeedbackToSlack } from '@/lib/feedback/slack'
import { updateFeedbackSchema } from '@/lib/feedback/types'
import { type FeedbackDocument, getFeedbackCollection } from '@/lib/mongodb'
import { validateSameOrigin } from '@/lib/tracking/api'
import { ObjectId } from 'mongodb'
import { after, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const EDIT_WINDOW_MS = 60 * 60 * 1000
const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const forbidden = validateSameOrigin(request)
  if (forbidden) return forbidden

  const { id } = await params
  if (!OBJECT_ID_PATTERN.test(id)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = updateFeedbackSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid feedback' },
      { status: 400 }
    )
  }

  const { deviceId, rating, message } = parsed.data
  const update: Partial<FeedbackDocument> = { updatedAt: new Date() }
  if (rating != null) update.rating = rating
  if (message) update.message = message

  try {
    const collection = await getFeedbackCollection()
    const updated = await collection.findOneAndUpdate(
      {
        _id: new ObjectId(id),
        deviceId,
        createdAt: { $gte: new Date(Date.now() - EDIT_WINDOW_MS) },
      },
      { $set: update },
      { returnDocument: 'after' }
    )

    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (message) after(() => notifyFeedbackToSlack(updated, 'message_added'))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update feedback:', error)
    return NextResponse.json(
      { error: 'Failed to update feedback' },
      { status: 500 }
    )
  }
}
