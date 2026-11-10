import { describe, expect, it } from 'vitest'
import {
  createFeedbackSchema,
  feedbackListQuerySchema,
  FEEDBACK_MESSAGE_MAX_LENGTH,
  FEEDBACK_TAG_LABELS,
  FEEDBACK_TAGS,
  getFeedbackTagsForRating,
  updateFeedbackSchema,
} from './types'

const base = { deviceId: 'device-1', source: 'feedback_button' as const }

describe('createFeedbackSchema', () => {
  it('accepts a rating without a message', () => {
    expect(createFeedbackSchema.safeParse({ ...base, rating: 4 }).success).toBe(
      true
    )
  })

  it('accepts a message without a rating and trims it', () => {
    const result = createFeedbackSchema.safeParse({
      ...base,
      rating: null,
      message: '  Add dark flags  ',
    })
    expect(result.success).toBe(true)
    expect(result.data?.message).toBe('Add dark flags')
  })

  it('rejects feedback with neither a rating nor a message', () => {
    const result = createFeedbackSchema.safeParse({
      ...base,
      rating: null,
      message: '   ',
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe(
      'A rating or a message is required'
    )
  })

  it.each([0, 6, 3.5])('rejects rating %s', (rating) => {
    expect(createFeedbackSchema.safeParse({ ...base, rating }).success).toBe(
      false
    )
  })

  it('rejects messages over the maximum length', () => {
    const message = 'a'.repeat(FEEDBACK_MESSAGE_MAX_LENGTH + 1)
    expect(createFeedbackSchema.safeParse({ ...base, message }).success).toBe(
      false
    )
  })

  it('rejects unknown sources and export types', () => {
    expect(
      createFeedbackSchema.safeParse({ ...base, rating: 5, source: 'email' })
        .success
    ).toBe(false)
    expect(
      createFeedbackSchema.safeParse({
        ...base,
        rating: 5,
        context: { exportType: 'poster' },
      }).success
    ).toBe(false)
  })

  it('requires a device id', () => {
    expect(
      createFeedbackSchema.safeParse({ ...base, deviceId: '', rating: 5 })
        .success
    ).toBe(false)
  })
})

describe('updateFeedbackSchema', () => {
  it('accepts a follow-up message', () => {
    expect(
      updateFeedbackSchema.safeParse({ deviceId: 'device-1', message: 'More!' })
        .success
    ).toBe(true)
  })

  it('rejects an empty update', () => {
    expect(
      updateFeedbackSchema.safeParse({ deviceId: 'device-1', message: ' ' })
        .success
    ).toBe(false)
    expect(
      updateFeedbackSchema.safeParse({ deviceId: 'device-1', tags: [] }).success
    ).toBe(false)
  })

  it('accepts quick-reply tags on their own and drops duplicates', () => {
    const result = updateFeedbackSchema.safeParse({
      deviceId: 'device-1',
      tags: ['bug', 'bug', 'missing_feature'],
    })
    expect(result.success).toBe(true)
    expect(result.data?.tags).toEqual(['bug', 'missing_feature'])
  })

  it('rejects unknown tags', () => {
    expect(
      updateFeedbackSchema.safeParse({ deviceId: 'device-1', tags: ['spam'] })
        .success
    ).toBe(false)
  })
})

describe('feedback tags', () => {
  it('offers problems for low ratings and praise for high ones', () => {
    expect(getFeedbackTagsForRating(1)).toContain('bug')
    expect(getFeedbackTagsForRating(3)).toContain('bug')
    expect(getFeedbackTagsForRating(4)).toContain('design')
    expect(getFeedbackTagsForRating(5)).toContain('design')
  })

  it('labels every tag', () => {
    for (const tag of FEEDBACK_TAGS) {
      expect(FEEDBACK_TAG_LABELS[tag]).toBeTruthy()
    }
  })
})

describe('feedbackListQuerySchema', () => {
  it('applies defaults', () => {
    expect(feedbackListQuerySchema.parse({})).toEqual({
      rating: 'all',
      source: 'all',
      sortField: 'createdAt',
      sortOrder: 'desc',
      limit: 30,
      offset: 0,
    })
  })

  it('coerces numeric paging params from strings', () => {
    const query = feedbackListQuerySchema.parse({ limit: '10', offset: '20' })
    expect(query.limit).toBe(10)
    expect(query.offset).toBe(20)
  })

  it('rejects out-of-range values', () => {
    expect(feedbackListQuerySchema.safeParse({ limit: '1000' }).success).toBe(
      false
    )
    expect(feedbackListQuerySchema.safeParse({ rating: '7' }).success).toBe(
      false
    )
    expect(
      feedbackListQuerySchema.safeParse({ sortField: 'deviceId' }).success
    ).toBe(false)
  })
})
