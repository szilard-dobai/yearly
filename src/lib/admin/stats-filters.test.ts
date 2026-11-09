import { describe, expect, it } from 'vitest'
import { parseStatsFilters } from './stats-filters'

const parse = (query: string) => parseStatsFilters(new URLSearchParams(query))

describe('parseStatsFilters', () => {
  it('returns no filters when nothing is set', () => {
    expect(parse('')).toEqual({})
  })

  it('turns the date range into a timestamp window', () => {
    expect(
      parse('from=2026-10-26T16:00:00.000Z&to=2026-10-30T16:00:00.000Z')
    ).toEqual({
      timestamp: {
        $gte: new Date('2026-10-26T16:00:00.000Z'),
        $lt: new Date('2026-10-30T16:00:00.000Z'),
      },
    })
  })

  it('keeps an open-ended range', () => {
    expect(parse('from=2026-10-26T16:00:00.000Z')).toEqual({
      timestamp: { $gte: new Date('2026-10-26T16:00:00.000Z') },
    })
  })

  it('filters by country and region unless set to all', () => {
    expect(parse('country=SG&region=all')).toEqual({ country: 'SG' })
    expect(parse('country=all&region=Bavaria')).toEqual({ region: 'Bavaria' })
  })

  it('rejects an invalid date', () => {
    expect(parse('from=yesterday')).toBeNull()
    expect(parse('to=nope')).toBeNull()
  })
})
