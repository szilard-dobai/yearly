import { getTrackingCollection } from '@/lib/mongodb'
import { parseObjectId } from '@/lib/object-id'
import { requireAdmin } from '@/lib/tracking/api'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

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
    const collection = await getTrackingCollection()
    const { deletedCount } = await collection.deleteOne({ _id: objectId })

    if (!deletedCount) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete event:', error)
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    )
  }
}
