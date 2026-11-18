import { getWaitlistCollection } from '@/lib/mongodb'
import { readUnsubscribeToken } from '@/lib/waitlist/unsubscribe'
import { ObjectId } from 'mongodb'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

// Mail apps send one-click unsubscribes (RFC 8058) from their own servers,
// so this can't require a same-origin request; the signed token is the check
export async function POST(request: Request) {
  const waitlistId = readUnsubscribeToken(
    new URL(request.url).searchParams.get('token')
  )
  if (!waitlistId) {
    return NextResponse.json(
      { error: "This unsubscribe link isn't valid" },
      { status: 400, headers: NO_STORE }
    )
  }

  try {
    const collection = await getWaitlistCollection()
    await collection.deleteOne({ _id: new ObjectId(waitlistId) })
    return NextResponse.json({ success: true }, { headers: NO_STORE })
  } catch (error) {
    console.error('Failed to unsubscribe from the waitlist:', error)
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500, headers: NO_STORE }
    )
  }
}
