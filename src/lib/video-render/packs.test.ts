import { describe, expect, it } from 'vitest'
import { isVideoPack, renderPathname, videosInPack } from './packs'

describe('videosInPack', () => {
  it('makes the year and stats videos in both themes for a year pack', () => {
    expect(videosInPack('year')).toEqual([
      { kind: 'year', theme: 'dark' },
      { kind: 'year', theme: 'light' },
      { kind: 'stats', theme: 'dark' },
      { kind: 'stats', theme: 'light' },
    ])
  })

  it('makes the month video in both themes for a month pack', () => {
    expect(videosInPack('month')).toEqual([
      { kind: 'month', theme: 'dark' },
      { kind: 'month', theme: 'light' },
    ])
  })
})

describe('isVideoPack', () => {
  it.each([
    ['year', true],
    ['month', true],
    ['stats', false],
    ['toString', false],
    [undefined, false],
  ])('%s → %s', (value, expected) => {
    expect(isVideoPack(value)).toBe(expected)
  })
})

describe('renderPathname', () => {
  it('keeps each environment and render in its own folder', () => {
    expect(
      renderPathname('preview', 'example-abc', {
        kind: 'stats',
        theme: 'light',
      })
    ).toBe('preview/renders/example-abc/stats-light.mp4')
  })
})
