import { escapeRegex } from '@/lib/feedback/query'
import type { Document } from 'mongodb'

export function buildEventListFilter(params: URLSearchParams): Document {
  const filter: Document = {}
  const conditions: Document[] = []

  const type = params.get('type')
  const id = params.get('id')?.trim()
  const search = params.get('search')
  const country = params.get('country')
  const region = params.get('region')

  if (type && type !== 'all') filter.type = type
  if (country && country !== 'all') filter.country = country
  if (region && region !== 'all') filter.region = region
  if (id) {
    const pattern = { $regex: escapeRegex(id), $options: 'i' }
    conditions.push({ $or: [{ deviceId: pattern }, { userId: pattern }] })
  }
  if (search) {
    conditions.push({
      $or: [
        { metadata: { $regex: search, $options: 'i' } },
        { type: { $regex: search, $options: 'i' } },
      ],
    })
  }
  if (conditions.length > 0) filter.$and = conditions

  return filter
}
