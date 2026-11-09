import type { Document } from 'mongodb'

function parseInstant(value: string | null): Date | null | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function parseStatsFilters(params: URLSearchParams): Document | null {
  const from = parseInstant(params.get('from'))
  const to = parseInstant(params.get('to'))
  if (from === null || to === null) return null

  const filters: Document = {}
  if (from || to) {
    filters.timestamp = {
      ...(from && { $gte: from }),
      ...(to && { $lt: to }),
    }
  }
  const country = params.get('country')
  const region = params.get('region')
  if (country && country !== 'all') filters.country = country
  if (region && region !== 'all') filters.region = region
  return filters
}
