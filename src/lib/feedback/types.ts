import { z } from 'zod'
import type { DeviceType } from '@/lib/tracking/types'

export const FEEDBACK_MESSAGE_MAX_LENGTH = 2000
export const FEEDBACK_RATINGS = [1, 2, 3, 4, 5] as const
export const FEEDBACK_SOURCES = [
  'post_export',
  'feedback_button',
  'mobile_fab',
] as const
export const EXPORT_TYPES = ['calendar', 'statistics', 'monthly'] as const
export const FEEDBACK_SORT_FIELDS = ['createdAt', 'rating'] as const

export type FeedbackSource = (typeof FEEDBACK_SOURCES)[number]
export type ExportType = (typeof EXPORT_TYPES)[number]
export type FeedbackSortField = (typeof FEEDBACK_SORT_FIELDS)[number]

export const FEEDBACK_SOURCE_LABELS: Record<FeedbackSource, string> = {
  post_export: 'After export',
  feedback_button: 'Feedback button',
  mobile_fab: 'Mobile menu',
}

const deviceIdSchema = z.string().trim().min(1).max(100)
const ratingSchema = z.int().min(1).max(5)
const messageSchema = z.string().trim().max(FEEDBACK_MESSAGE_MAX_LENGTH)

export const feedbackContextSchema = z.object({
  exportType: z.enum(EXPORT_TYPES).optional(),
  year: z.int().min(1900).max(2200).optional(),
})

export type FeedbackContext = z.infer<typeof feedbackContextSchema>

export const createFeedbackSchema = z
  .object({
    deviceId: deviceIdSchema,
    rating: ratingSchema.nullish(),
    message: messageSchema.nullish(),
    source: z.enum(FEEDBACK_SOURCES),
    context: feedbackContextSchema.optional(),
    deviceType: z.enum(['mobile', 'tablet', 'desktop']).optional(),
  })
  .refine((data) => data.rating != null || !!data.message, {
    message: 'A rating or a message is required',
  })

export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>

export const updateFeedbackSchema = z
  .object({
    deviceId: deviceIdSchema,
    rating: ratingSchema.optional(),
    message: messageSchema.optional(),
  })
  .refine((data) => data.rating != null || !!data.message, {
    message: 'A rating or a message is required',
  })

export const feedbackListQuerySchema = z.object({
  rating: z.enum(['all', 'none', '1', '2', '3', '4', '5']).default('all'),
  source: z.enum(['all', ...FEEDBACK_SOURCES]).default('all'),
  hasMessage: z.enum(['true', 'false']).optional(),
  search: z.string().trim().max(200).optional(),
  sortField: z.enum(FEEDBACK_SORT_FIELDS).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  offset: z.coerce.number().int().min(0).default(0),
})

export type FeedbackListQuery = z.infer<typeof feedbackListQuerySchema>

export interface FeedbackEntry {
  _id: string
  deviceId: string
  rating: number | null
  message: string | null
  source: FeedbackSource
  context?: FeedbackContext
  deviceType?: DeviceType
  userAgent?: string
  country?: string
  region?: string
  createdAt: string
  updatedAt: string
}

export interface FeedbackStats {
  total: number
  averageRating: number | null
  ratedCount: number
  withMessage: number
  lastSevenDays: number
  distribution: Record<1 | 2 | 3 | 4 | 5, number>
}
