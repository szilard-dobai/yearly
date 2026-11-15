import { timingSafeEqual } from 'node:crypto'

export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const expected = Buffer.from(`Bearer ${secret}`)
  const received = Buffer.from(request.headers.get('authorization') ?? '')
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  )
}
