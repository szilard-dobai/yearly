import type { VideoKind, VideoTheme } from '@/lib/video'

export const CHECKOUT_TOKEN_PARAM = 'customer_session_token'
export const VIDEO_ORDER_PARAM = 'video_order'
export const VIDEO_OFFER_PARAM = 'video_offer'
export const VIDEO_RESUME_PARAM = 'video'

const PRIVATE_PARAMS = [
  CHECKOUT_TOKEN_PARAM,
  VIDEO_ORDER_PARAM,
  VIDEO_OFFER_PARAM,
]
const RETURN_PARAMS = [...PRIVATE_PARAMS, VIDEO_RESUME_PARAM]

const ORDER_ID = /^[A-Za-z0-9-]{1,64}$/
const YEAR_RESUME = /^(year|stats)-(dark|light)-(\d{4})$/
const MONTH_RESUME = /^month-(dark|light)-(\d{4})-(\d{2})$/

export interface VideoResume {
  kind: VideoKind
  theme: VideoTheme
  year: number
  month?: number
}

export type VideoReturn =
  | { type: 'order'; orderId: string }
  | { type: 'offer'; orderId: string }
  | { type: 'resume'; resume: VideoResume }

function withoutParams(href: string, names: string[]): string | null {
  const url = new URL(href)
  if (!names.some((name) => url.searchParams.has(name))) return null
  for (const name of names) url.searchParams.delete(name)
  return `${url.pathname}${url.search}${url.hash}`
}

export function stripCheckoutToken(win: Window = window) {
  const next = withoutParams(win.location.href, [CHECKOUT_TOKEN_PARAM])
  if (next !== null) win.history.replaceState(win.history.state, '', next)
}

export function removeVideoReturnParams(win: Window = window) {
  const next = withoutParams(win.location.href, RETURN_PARAMS)
  if (next !== null) win.history.replaceState(win.history.state, '', next)
}

export function scrubPrivateParams(href: string): string {
  try {
    const url = new URL(href)
    if (!PRIVATE_PARAMS.some((name) => url.searchParams.has(name))) {
      return href
    }
    for (const name of PRIVATE_PARAMS) url.searchParams.delete(name)
    return url.toString()
  } catch {
    return href
  }
}

export function encodeVideoResume({ kind, theme, year, month }: VideoResume) {
  return kind === 'month' && month !== undefined
    ? `month-${theme}-${year}-${String(month + 1).padStart(2, '0')}`
    : `${kind === 'stats' ? 'stats' : 'year'}-${theme}-${year}`
}

export function decodeVideoResume(value: string): VideoResume | null {
  const yearMatch = YEAR_RESUME.exec(value)
  if (yearMatch) {
    return {
      kind: yearMatch[1] as VideoKind,
      theme: yearMatch[2] as VideoTheme,
      year: Number(yearMatch[3]),
    }
  }
  const monthMatch = MONTH_RESUME.exec(value)
  if (monthMatch) {
    const month = Number(monthMatch[3]) - 1
    if (month < 0 || month > 11) return null
    return {
      kind: 'month',
      theme: monthMatch[1] as VideoTheme,
      year: Number(monthMatch[2]),
      month,
    }
  }
  return null
}

export function videoResumePath(resume: VideoResume) {
  return `/create?${VIDEO_RESUME_PARAM}=${encodeVideoResume(resume)}`
}

export function readVideoReturn(search: string): VideoReturn | null {
  const params = new URLSearchParams(search)
  const orderId = params.get(VIDEO_ORDER_PARAM)
  if (orderId && ORDER_ID.test(orderId)) return { type: 'order', orderId }
  const offerId = params.get(VIDEO_OFFER_PARAM)
  if (offerId && ORDER_ID.test(offerId)) {
    return { type: 'offer', orderId: offerId }
  }
  const resume = decodeVideoResume(params.get(VIDEO_RESUME_PARAM) ?? '')
  return resume ? { type: 'resume', resume } : null
}
