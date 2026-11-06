import { detectInAppBrowser } from './in-app-browser'

export const UTM_KEYS = [
  'source',
  'medium',
  'campaign',
  'content',
  'term',
] as const

export type UtmKey = (typeof UTM_KEYS)[number]
export type UtmParams = Partial<Record<UtmKey, string>>

export type TrafficSource = {
  referrer?: string
  utm?: UtmParams
  inAppBrowser?: string
  userAgent?: string
}

const UTM_VALUE_MAX_LENGTH = 200

export function getExternalReferrer(
  referrer: string,
  currentOrigin: string
): string | undefined {
  if (!referrer) return undefined
  try {
    const url = new URL(referrer)
    if (url.origin === currentOrigin) return undefined
    return `${url.protocol}//${url.host}${url.pathname}`
  } catch {
    return undefined
  }
}

export function getUtmParams(search: string): UtmParams | undefined {
  const params = new URLSearchParams(search)
  const utm: UtmParams = {}
  for (const key of UTM_KEYS) {
    const value = params.get(`utm_${key}`)?.trim()
    if (value) utm[key] = value.slice(0, UTM_VALUE_MAX_LENGTH)
  }
  return Object.keys(utm).length > 0 ? utm : undefined
}

export function getTrafficSource(): TrafficSource {
  if (typeof window === 'undefined') return {}
  const userAgent = navigator.userAgent
  return {
    referrer: getExternalReferrer(document.referrer, window.location.origin),
    utm: getUtmParams(window.location.search),
    inAppBrowser: detectInAppBrowser(userAgent, window),
    userAgent: userAgent || undefined,
  }
}
