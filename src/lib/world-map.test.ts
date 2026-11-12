import atlas from 'world-atlas/countries-110m.json'
import { describe, expect, it } from 'vitest'
import {
  countriesInScope,
  fitView,
  projectWorld,
  shadeClass,
  shareOfWorld,
} from './world-map'

describe('projectWorld', () => {
  const world = projectWorld(atlas)

  it('maps outlines to app country codes and drops Antarctica', () => {
    const codes = new Set(world.shapes.map((s) => s.code))
    expect(codes.has('FR')).toBe(true)
    expect(codes.has('JP')).toBe(true)
    expect(world.shapes.some((s) => s.name === 'Antarctica')).toBe(false)
  })

  it('fits the map to the standard width', () => {
    expect(world.viewBox.split(' ')[2]).toBe('960')
  })

  it('zooms in on a group of countries', () => {
    const europe = world.shapes.filter((s) =>
      ['ES', 'FR', 'IT'].includes(s.code ?? '')
    )
    const view = fitView(world.viewBox, europe)
    expect(view).not.toBeNull()
    expect(view!.scale).toBeLessThan(0.5)
  })
})

describe('countriesInScope', () => {
  const dayMap = new Map([
    ['2025-08-10', ['GR']],
    ['2026-06-24', ['FR', 'IT']],
    ['2026-06-25', ['IT']],
  ])

  it('counts days per country for one year', () => {
    expect(countriesInScope(dayMap, 2026)).toEqual([
      { code: 'IT', days: 2 },
      { code: 'FR', days: 1 },
    ])
  })

  it('counts every year for all time', () => {
    expect(countriesInScope(dayMap, null).map((c) => c.code)).toEqual([
      'IT',
      'GR',
      'FR',
    ])
  })
})

describe('helpers', () => {
  it('works out the share of the world', () => {
    expect(shareOfWorld(12)).toBe(6)
  })

  it('shades by days spent', () => {
    expect(shadeClass(2)).toContain('#9ec5f4')
    expect(shadeClass(20)).toContain('#184f95')
  })
})
