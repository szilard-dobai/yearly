import { getDeviceType, trackEvent } from '@/lib/tracking'
import { getDeviceId } from '@/lib/tracking/device-id'
import { markFeedbackSubmitted } from './prompt'
import type { FeedbackContext, FeedbackSource, FeedbackTag } from './types'

interface SubmitFeedbackInput {
  rating: number | null
  message: string | null
  tags?: FeedbackTag[]
  source: FeedbackSource
  context?: FeedbackContext
}

interface UpdateFeedbackInput {
  rating?: number
  message?: string
  tags?: FeedbackTag[]
}

async function readError(response: Response): Promise<Error> {
  try {
    const data = await response.json()
    return new Error(data.error || 'Failed to send feedback')
  } catch {
    return new Error('Failed to send feedback')
  }
}

export async function submitFeedback(
  input: SubmitFeedbackInput
): Promise<{ id: string }> {
  const message = input.message?.trim() || null
  const tags = input.tags?.length ? input.tags : undefined
  const response = await fetch('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...input,
      message,
      tags,
      deviceId: getDeviceId(),
      deviceType: getDeviceType(),
    }),
  })

  if (!response.ok) {
    throw await readError(response)
  }

  const data: { id: string } = await response.json()
  markFeedbackSubmitted()
  trackEvent('feedback_submitted', {
    feedbackId: data.id,
    source: input.source,
    rating: input.rating,
    hasMessage: !!message,
    ...(tags && { tags }),
    ...input.context,
  })
  return data
}

export async function updateFeedback(
  id: string,
  input: UpdateFeedbackInput
): Promise<void> {
  const message = input.message?.trim() || undefined
  const tags = input.tags?.length ? input.tags : undefined
  const response = await fetch(`/api/feedback/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...input, message, tags, deviceId: getDeviceId() }),
  })

  if (!response.ok) {
    throw await readError(response)
  }

  trackEvent('feedback_submitted', {
    feedbackId: id,
    rating: input.rating ?? null,
    hasMessage: !!message,
    ...(tags && { tags }),
    isFollowUp: true,
  })
}
