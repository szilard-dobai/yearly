import { describe, expect, it } from 'vitest'
import { buildEventListFilter } from './event-filters'

function filterFor(params: Record<string, string>) {
  return buildEventListFilter(new URLSearchParams(params))
}

describe('buildEventListFilter', () => {
  it('matches nothing in particular without filters', () => {
    expect(filterFor({})).toEqual({})
    expect(filterFor({ type: 'all', country: 'all', region: 'all' })).toEqual(
      {}
    )
  })

  it('matches an ID against both the device and the account', () => {
    expect(filterFor({ id: ' abc123 ' })).toEqual({
      $and: [
        {
          $or: [
            { deviceId: { $regex: 'abc123', $options: 'i' } },
            { userId: { $regex: 'abc123', $options: 'i' } },
          ],
        },
      ],
    })
  })

  it('treats the ID as plain text', () => {
    expect(filterFor({ id: 'a.b*' }).$and[0].$or[0].deviceId.$regex).toBe(
      'a\\.b\\*'
    )
  })

  it('combines the ID with a metadata search and the other filters', () => {
    expect(
      filterFor({
        type: 'homepage_view',
        id: 'user-1',
        search: 'instagram',
        country: 'RO',
        region: 'CJ',
      })
    ).toEqual({
      type: 'homepage_view',
      country: 'RO',
      region: 'CJ',
      $and: [
        {
          $or: [
            { deviceId: { $regex: 'user-1', $options: 'i' } },
            { userId: { $regex: 'user-1', $options: 'i' } },
          ],
        },
        {
          $or: [
            { metadata: { $regex: 'instagram', $options: 'i' } },
            { type: { $regex: 'instagram', $options: 'i' } },
          ],
        },
      ],
    })
  })
})
