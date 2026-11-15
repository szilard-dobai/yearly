import { MONTH_NAMES } from '@/lib/constants'
import type { OrderSummary, VideoSummary } from './client'

export type SaveMethod = 'share' | 'download'

export function videoFilename(
  order: Pick<OrderSummary, 'pack' | 'year' | 'month'>,
  video: Pick<VideoSummary, 'kind' | 'theme'>
) {
  const period =
    order.pack === 'month' && order.month !== null
      ? `${order.year}-${MONTH_NAMES[order.month].toLowerCase()}`
      : String(order.year)
  const kind = order.pack === 'month' ? '' : `-${video.kind}`
  return `yearly-${period}${kind}-${video.theme}.mp4`
}

export function isPhoneOrTablet(nav: Navigator = navigator) {
  const userAgent = nav.userAgent
  return (
    /Mobi|Android|iPad|iPhone|iPod/i.test(userAgent) ||
    (/Macintosh/.test(userAgent) && nav.maxTouchPoints > 1)
  )
}

export function canShareVideoFiles(nav: Navigator = navigator) {
  if (!isPhoneOrTablet(nav) || typeof nav.canShare !== 'function') {
    return false
  }
  try {
    return nav.canShare({
      files: [new File([], 'yearly.mp4', { type: 'video/mp4' })],
    })
  } catch {
    return false
  }
}

export function saveMethod(nav: Navigator = navigator): SaveMethod {
  return canShareVideoFiles(nav) ? 'share' : 'download'
}

export async function fetchVideoFile(url: string, filename: string) {
  const response = await fetch(url)
  if (!response.ok)
    throw new Error(`Video download failed with ${response.status}`)
  const blob = await response.blob()
  return new File([blob], filename, { type: 'video/mp4' })
}

export function downloadFile(file: File) {
  const href = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = href
  link.download = file.name
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(href), 60_000)
}

export type ShareOutcome = 'shared' | 'cancelled' | 'blocked' | 'unsupported'

export async function shareFile(file: File): Promise<ShareOutcome> {
  try {
    await navigator.share({ files: [file] })
    return 'shared'
  } catch (error) {
    if (error instanceof DOMException) {
      if (error.name === 'AbortError') return 'cancelled'
      if (error.name === 'NotAllowedError') return 'blocked'
    }
    return 'unsupported'
  }
}
