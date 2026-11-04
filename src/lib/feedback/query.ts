import type { Document } from 'mongodb'
import type { FeedbackListQuery } from './types'

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function buildFeedbackFilter(query: FeedbackListQuery): Document {
  const filter: Document = {}

  if (query.rating === 'none') {
    filter.rating = null
  } else if (query.rating !== 'all') {
    filter.rating = Number(query.rating)
  }

  if (query.source !== 'all') {
    filter.source = query.source
  }

  if (query.search) {
    filter.message = { $regex: escapeRegex(query.search), $options: 'i' }
  } else if (query.hasMessage === 'true') {
    filter.message = { $nin: [null, ''] }
  } else if (query.hasMessage === 'false') {
    filter.message = { $in: [null, ''] }
  }

  return filter
}

export function buildFeedbackListPipeline(
  query: FeedbackListQuery
): Document[] {
  const direction = query.sortOrder === 'asc' ? 1 : -1
  const pipeline: Document[] = [{ $match: buildFeedbackFilter(query) }]

  if (query.sortField === 'rating') {
    pipeline.push(
      {
        $addFields: {
          _hasRating: {
            $cond: [{ $eq: [{ $ifNull: ['$rating', null] }, null] }, 0, 1],
          },
        },
      },
      { $sort: { _hasRating: -1, rating: direction, createdAt: -1, _id: -1 } },
      { $project: { _hasRating: 0 } }
    )
  } else {
    pipeline.push({ $sort: { createdAt: direction, _id: direction } })
  }

  pipeline.push({ $skip: query.offset }, { $limit: query.limit })
  return pipeline
}
