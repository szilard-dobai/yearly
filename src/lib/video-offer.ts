export const VIDEO_PACK_PRICE = 2.99

export function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`
}

export const VIDEO_LAUNCH_LABEL = 'early December'

export const FREE_VIDEO_LAST_DAY = '2027-01-31'

export function formatFreeVideoLastDay(day = FREE_VIDEO_LAST_DAY): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
