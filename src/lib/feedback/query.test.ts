import { describe, expect, it } from 'vitest'
import {
  buildFeedbackFilter,
  buildFeedbackListPipeline,
  escapeRegex,
} from './query'
import { feedbackListQuerySchema } from './types'

const query = (params: Record<string, string> = {}) =>
  feedbackListQuerySchema.parse(params)

describe('escapeRegex', () => {
  it('escapes regex metacharacters', () => {
    expect(escapeRegex('a.b*c(d)?')).toBe('a\\.b\\*c\\(d\\)\\?')
  })
})

describe('buildFeedbackFilter', () => {
  it('returns an empty filter by default', () => {
    expect(buildFeedbackFilter(query())).toEqual({})
  })

  it('filters by numeric rating', () => {
    expect(buildFeedbackFilter(query({ rating: '2' }))).toEqual({ rating: 2 })
  })

  it('filters unrated feedback', () => {
    expect(buildFeedbackFilter(query({ rating: 'none' }))).toEqual({
      rating: null,
    })
  })

  it('filters by source', () => {
    expect(buildFeedbackFilter(query({ source: 'post_export' }))).toEqual({
      source: 'post_export',
    })
  })

  it('filters to feedback with a message', () => {
    expect(buildFeedbackFilter(query({ hasMessage: 'true' }))).toEqual({
      message: { $nin: [null, ''] },
    })
  })

  it('searches messages case-insensitively with escaped input', () => {
    expect(buildFeedbackFilter(query({ search: 'pdf (export)' }))).toEqual({
      message: { $regex: 'pdf \\(export\\)', $options: 'i' },
    })
  })
})

describe('buildFeedbackListPipeline', () => {
  it('sorts by date with paging', () => {
    expect(
      buildFeedbackListPipeline(
        query({ sortOrder: 'asc', offset: '30', limit: '10' })
      )
    ).toEqual([
      { $match: {} },
      { $sort: { createdAt: 1, _id: 1 } },
      { $skip: 30 },
      { $limit: 10 },
    ])
  })

  it('sorts by rating with unrated feedback last', () => {
    const pipeline = buildFeedbackListPipeline(
      query({ sortField: 'rating', sortOrder: 'asc' })
    )
    expect(pipeline).toContainEqual({
      $sort: { _hasRating: -1, rating: 1, createdAt: -1, _id: -1 },
    })
    expect(pipeline).toContainEqual({ $project: { _hasRating: 0 } })
  })
})
