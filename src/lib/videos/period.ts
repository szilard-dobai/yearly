import { calendarDaysSchema } from '@/lib/calendar-sync/days'
import { getCountryByCode } from '@/lib/countries'
import type { VideoPack } from '@/lib/db/schema'
import { z } from 'zod'

export const MAX_UPDATES = 3
export const MIN_SHARED_DAYS = 0.8

export type VideoPeriod =
  | { pack: 'year'; year: number }
  | { pack: 'month'; year: number; month: number }

export function periodPrefix(period: VideoPeriod): string {
  return period.pack === 'year'
    ? `${period.year}-`
    : `${period.year}-${String(period.month + 1).padStart(2, '0')}-`
}

export function daysInPeriod(
  days: Record<string, string[]>,
  period: VideoPeriod
): Record<string, string[]> {
  const prefix = periodPrefix(period)
  return Object.fromEntries(
    Object.entries(days).filter(([day]) => day.startsWith(prefix))
  )
}

export function keepsEnoughDays(
  first: Record<string, string[]>,
  next: Record<string, string[]>
): boolean {
  const firstDays = Object.keys(first)
  if (firstDays.length === 0) return true
  const kept = firstDays.filter((day) => day in next).length
  return kept / firstDays.length >= MIN_SHARED_DAYS
}

const yearSchema = z
  .number()
  .int()
  .min(2000)
  .refine((year) => year <= new Date().getUTCFullYear() + 1)

const daysSchema = calendarDaysSchema.refine((days) =>
  Object.values(days).every((codes) =>
    codes.every((code) => getCountryByCode(code) !== undefined)
  )
)

export const videoRequestSchema = z.object({
  days: daysSchema,
  weekStartsOn: z.number().int().min(0).max(6),
})

export const createOrderSchema = videoRequestSchema.and(
  z.discriminatedUnion('pack', [
    z.object({ pack: z.literal('year' satisfies VideoPack), year: yearSchema }),
    z.object({
      pack: z.literal('month' satisfies VideoPack),
      year: yearSchema,
      month: z.number().int().min(0).max(11),
    }),
  ])
)

export type CreateOrderInput = z.infer<typeof createOrderSchema>

export function periodOf(order: {
  pack: VideoPack
  year: number
  month: number | null
}): VideoPeriod {
  return order.pack === 'month'
    ? { pack: 'month', year: order.year, month: order.month ?? 0 }
    : { pack: 'year', year: order.year }
}
