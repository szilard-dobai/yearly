import { EXPORT_TYPES } from '@/lib/feedback/types'
import { VIDEO_KINDS } from '@/lib/video'
import { z } from 'zod'

export const WAITLIST_FEATURES = ['animated_video'] as const

export type WaitlistFeature = (typeof WAITLIST_FEATURES)[number]

export const waitlistContextSchema = z.object({
  exportType: z.enum(EXPORT_TYPES).optional(),
  videoKind: z.enum(VIDEO_KINDS).optional(),
  year: z.int().min(1900).max(2200).optional(),
  price: z.number().positive().max(100).optional(),
})

export type WaitlistContext = z.infer<typeof waitlistContextSchema>

export const joinWaitlistSchema = z.object({
  email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
  deviceId: z.string().trim().min(1).max(100),
  feature: z.enum(WAITLIST_FEATURES),
  context: waitlistContextSchema.optional(),
  deviceType: z.enum(['mobile', 'tablet', 'desktop']).optional(),
})

export type JoinWaitlistInput = z.infer<typeof joinWaitlistSchema>
