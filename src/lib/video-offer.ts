export const ANIMATED_VIDEO_PRICES = [1.99, 2.99] as const

export function getAnimatedVideoPrice(deviceId: string): number {
  let hash = 0
  for (const char of deviceId) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return ANIMATED_VIDEO_PRICES[hash % ANIMATED_VIDEO_PRICES.length]
}

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}
