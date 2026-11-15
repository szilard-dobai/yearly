import { type CalendarDays, toCalendarDays } from '@/lib/calendar-sync/days'
import { MONTH_NAMES } from '@/lib/constants'
import type { CountryVisit } from '@/lib/types'
import { daysInPeriod, type VideoPeriod } from './period'
import type { OrderSummary, VideoSummary } from './summary'

export type { OrderSummary, VideoSummary }

export type OrderStage =
  | 'confirming'
  | 'making'
  | 'ready'
  | 'failed'
  | 'refunded'

export type CreateOrderError =
  | 'signed-out'
  | 'no-trips'
  | 'rate-limited'
  | 'checkout-unavailable'
  | 'failed'

export type CreateOrderResult =
  | { ok: true; orderId: string; free: true }
  | { ok: true; orderId: string; free: false; checkoutUrl: string }
  | { ok: false; error: CreateOrderError }

export type UpdateRefusal =
  | 'not-found'
  | 'not-paid'
  | 'busy'
  | 'unchanged'
  | 'no-updates-left'
  | 'too-different'
  | 'failed'

export type UpdateResult =
  | { ok: true; order: OrderSummary }
  | { ok: false; reason: UpdateRefusal }

export interface VideoAccount {
  freeVideo: boolean
  orders: OrderSummary[]
}

export class VideoRequestError extends Error {
  constructor(readonly status: number) {
    super(`Video request failed with ${status}`)
  }
}

const UPDATE_REFUSALS = new Set<UpdateRefusal>([
  'not-found',
  'not-paid',
  'busy',
  'unchanged',
  'no-updates-left',
  'too-different',
])

export function periodOfOrder(order: OrderSummary): VideoPeriod {
  return order.pack === 'month'
    ? { pack: 'month', year: order.year, month: order.month ?? 0 }
    : { pack: 'year', year: order.year }
}

export function orderPeriodLabel(
  order: Pick<OrderSummary, 'pack' | 'year' | 'month'>
) {
  return order.pack === 'month' && order.month !== null
    ? `${MONTH_NAMES[order.month]} ${order.year}`
    : String(order.year)
}

export function orderStage(order: OrderSummary): OrderStage {
  if (order.status === 'refunded') return 'refunded'
  if (order.status === 'draft') return 'confirming'
  if (order.render?.status === 'ready') return 'ready'
  if (order.render?.status === 'failed') return 'failed'
  return 'making'
}

export function isOrderWorking(order: OrderSummary) {
  const stage = orderStage(order)
  return stage === 'confirming' || stage === 'making'
}

export function videoRequestBody(
  period: VideoPeriod,
  visits: CountryVisit[] | CalendarDays,
  weekStartsOn: number
) {
  const days = Array.isArray(visits) ? toCalendarDays(visits) : visits
  return { days: daysInPeriod(days, period), weekStartsOn }
}

async function readBody(response: Response): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await response.json()
    return body && typeof body === 'object'
      ? (body as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

function post(url: string, body: unknown) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export async function fetchVideoAccount(): Promise<VideoAccount> {
  const response = await fetch('/api/videos/orders', { cache: 'no-store' })
  if (!response.ok) throw new VideoRequestError(response.status)
  return (await response.json()) as VideoAccount
}

export async function fetchVideoOrder(orderId: string): Promise<OrderSummary> {
  const response = await fetch(
    `/api/videos/orders/${encodeURIComponent(orderId)}`,
    { cache: 'no-store' }
  )
  if (!response.ok) throw new VideoRequestError(response.status)
  return (await response.json()) as OrderSummary
}

export async function createVideoOrder(
  period: VideoPeriod,
  visits: CountryVisit[],
  weekStartsOn: number
): Promise<CreateOrderResult> {
  let response: Response
  try {
    response = await post('/api/videos/orders', {
      ...period,
      ...videoRequestBody(period, visits, weekStartsOn),
    })
  } catch {
    return { ok: false, error: 'failed' }
  }
  const body = await readBody(response)
  if (response.status === 201 && typeof body.orderId === 'string') {
    if (body.free === true) {
      return { ok: true, orderId: body.orderId, free: true }
    }
    if (typeof body.checkoutUrl === 'string') {
      return {
        ok: true,
        orderId: body.orderId,
        free: false,
        checkoutUrl: body.checkoutUrl,
      }
    }
  }
  switch (response.status) {
    case 400:
      return { ok: false, error: 'no-trips' }
    case 401:
      return { ok: false, error: 'signed-out' }
    case 429:
      return { ok: false, error: 'rate-limited' }
    case 502:
      return { ok: false, error: 'checkout-unavailable' }
    default:
      return { ok: false, error: 'failed' }
  }
}

export async function requestVideoUpdate(
  order: OrderSummary,
  days: CalendarDays,
  weekStartsOn: number
): Promise<UpdateResult> {
  let response: Response
  try {
    response = await post(
      `/api/videos/orders/${encodeURIComponent(order.id)}/updates`,
      videoRequestBody(periodOfOrder(order), days, weekStartsOn)
    )
  } catch {
    return { ok: false, reason: 'failed' }
  }
  const body = await readBody(response)
  if (response.status === 202 && typeof body.id === 'string') {
    return { ok: true, order: body as unknown as OrderSummary }
  }
  const reason = body.error as UpdateRefusal
  return {
    ok: false,
    reason: UPDATE_REFUSALS.has(reason) ? reason : 'failed',
  }
}

export function withCheckoutTheme(
  checkoutUrl: string,
  theme: 'dark' | 'light'
) {
  try {
    const url = new URL(checkoutUrl)
    url.searchParams.set('theme', theme)
    return url.toString()
  } catch {
    return checkoutUrl
  }
}

export function goToCheckout(url: string) {
  window.location.assign(url)
}
