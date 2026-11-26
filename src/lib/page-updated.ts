export const PAGE_UPDATED = {
  home: '2026-11-24',
  create: '2026-11-24',
  videos: '2026-11-17',
  privacy: '2026-11-23',
  terms: '2026-11-23',
} as const

export function formatPageUpdated(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}
