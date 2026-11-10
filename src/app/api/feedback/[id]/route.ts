import { notifyFeedbackToSlack } from '@/lib/feedback/slack'
import { updateFeedbackSchema } from '@/lib/feedback/types'
import { type FeedbackDocument, getFeedbackCollection } from '@/lib/mongodb'
import { parseObjectId } from '@/lib/object-id'
import { requireAdmin, validateSameOrigin } from '@/lib/tracking/api'
import { after, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const EDIT_WINDOW_MS = 60 * 60 * 1000

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const forbidden = validateSameOrigin(request)
  if (forbidden) return forbidden

  const objectId = parseObjectId((await params).id)
  if (!objectId) {
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

  const { deviceId, rating, message, tags } = parsed.data
  const update: Partial<FeedbackDocument> = { updatedAt: new Date() }
  if (rating != null) update.rating = rating
  if (message) update.message = message
  if (tags?.length) update.tags = tags

  try {
    const collection = await getFeedbackCollection()
    const updated = await collection.findOneAndUpdate(
      {
        _id: objectId,
        deviceId,
        createdAt: { $gte: new Date(Date.now() - EDIT_WINDOW_MS) },
      },
      { $set: update },
      { returnDocument: 'after' }
    )

    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    if (message || tags?.length) {
      after(() => notifyFeedbackToSlack(updated, 'message_added'))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to update feedback:', error)
    return NextResponse.json(
      { error: 'Failed to update feedback' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  const objectId = parseObjectId((await params).id)
  if (!objectId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const collection = await getFeedbackCollection()
    const { deletedCount } = await collection.deleteOne({ _id: objectId })

    if (!deletedCount) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete feedback:', error)
    return NextResponse.json(
      { error: 'Failed to delete feedback' },
      { status: 500 }
    )
  }
}
