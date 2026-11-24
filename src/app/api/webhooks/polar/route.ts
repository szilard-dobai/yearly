import { db } from '@/lib/db'
import { deleteVideoFiles } from '@/lib/video-render/blob'
import { notFound } from '@/lib/videos/api'
import { isVideoSalesEnabled } from '@/lib/videos/enabled'
import { markOrderPaid, markOrderRefunded } from '@/lib/videos/orders'
import { ORDER_ID_METADATA_KEY } from '@/lib/videos/polar'
import { startRender } from '@/lib/videos/render'
import { webhooks } from '@polar-sh/sdk/2026-10'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function received(status = 202) {
  return NextResponse.json({ received: status < 300 }, { status })
}

export async function POST(request: Request) {
  if (!isVideoSalesEnabled()) return notFound()

  const secret = process.env.POLAR_WEBHOOK_SECRET
  if (!secret) {
    console.error('POLAR_WEBHOOK_SECRET is not set')
    return received(500)
  }

  const body = await request.text()
  let event: webhooks.WebhookPayload
  try {
    event = await webhooks.validateEvent(
      body,
      {
        'webhook-id': request.headers.get('webhook-id') ?? '',
        'webhook-timestamp': request.headers.get('webhook-timestamp') ?? '',
        'webhook-signature': request.headers.get('webhook-signature') ?? '',
      },
      secret
    )
  } catch (error) {
    if (error instanceof webhooks.PolarWebhookVerificationError) {
      return received(403)
    }
    if (error instanceof webhooks.PolarWebhookUnknownTypeError) {
      return received()
    }
    if (error instanceof webhooks.PolarWebhookError) return received(400)
    throw error
  }

  if (event.type === 'order.paid') {
    const order = event.data
    const orderId = order.metadata?.[ORDER_ID_METADATA_KEY]
    if (typeof orderId !== 'string') return received()

    const paid = await markOrderPaid(db, {
      orderId,
      polarOrderId: order.id,
      amountCents: order.total_amount,
      currency: order.currency,
    })
    if (paid) await startRender(db, paid.render.id, paid.pack)
  }

  if (event.type === 'order.refunded' && event.data.status === 'refunded') {
    const files = await markOrderRefunded(db, event.data.id)
    await deleteVideoFiles(files)
  }

  return received()
}
