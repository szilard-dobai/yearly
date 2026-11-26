// @vitest-environment node
import atlas from 'world-atlas/countries-50m.json'
import { describe, expect, it } from 'vitest'
import { COUNTRIES } from './countries'
import { CONTINENT_BY_COUNTRY } from './continents'
import { projectWorld } from './world-map-projection'
import {
  codesInContinent,
  continentsOf,
  countriesInScope,
  fitView,
  getMapScene,
  shadeIndex,
  shareOfWorld,
  type MapShape,
} from './world-map'

const world = projectWorld(atlas)

function shapeOf(code: string) {
  return world.shapes
    .filter((shape) => shape.code === code)
    .sort((a, b) => b.area - a.area)[0]
}

function within(inner: MapShape['bounds'], outer: MapShape['bounds']) {
  return (
    inner[0][0] >= outer[0][0] &&
    inner[0][1] >= outer[0][1] &&
    inner[1][0] <= outer[1][0] &&
    inner[1][1] <= outer[1][1]
  )
}

describe('projectWorld', () => {
  it('has an outline or a dot for every country people can pick', () => {
    const codes = new Set(world.shapes.map((shape) => shape.code))
    const missing = COUNTRIES.map((c) => c.code).filter((c) => !codes.has(c))

    expect(missing).toEqual([])
  })

  it('leaves out Antarctica and finds Kosovo by name', () => {
    expect(world.shapes.some((shape) => shape.name === 'Antarctica')).toBe(
      false
    )
    expect(shapeOf('XK').name).toBe('Kosovo')
  })

  it('places Tuvalu as a point, since the outlines have no shape for it', () => {
    const tuvalu = shapeOf('TV')

    expect(tuvalu.d).toBe('')
    expect(tuvalu.area).toBe(0)
    expect(tuvalu.centroid[0]).toBeGreaterThan(900)
  })

  it('fits the map to 960 wide', () => {
    expect(world.view.width).toBe(960)
    expect(world.view.height).toBeGreaterThan(400)
    expect(world.view.height).toBeLessThan(460)
  })

  it('places a flag on the mainland of a country with far-off islands', () => {
    const france = shapeOf('FR')
    const spain = shapeOf('ES')
    const width = france.bounds[1][0] - france.bounds[0][0]

    expect(width).toBeLessThan(40)
    expect(Math.abs(france.bounds[0][0] - spain.bounds[0][0])).toBeLessThan(30)
  })
})

describe('countriesInScope', () => {
  const dayMap = new Map([
    ['2025-08-10', ['GR']],
    ['2026-06-24', ['FR', 'IT']],
    ['2026-06-25', ['IT']],
  ])

  it('counts the days in each country for one year, most days first', () => {
    expect(countriesInScope(dayMap, 2026)).toEqual([
      { code: 'IT', days: 2 },
      { code: 'FR', days: 1 },
    ])
  })

  it('counts every year for all time', () => {
    expect(countriesInScope(dayMap, null)).toEqual([
      { code: 'IT', days: 2 },
      { code: 'FR', days: 1 },
      { code: 'GR', days: 1 },
    ])
  })
})

describe('continents and share of the world', () => {
  const countries = [
    { code: 'FR', days: 3 },
    { code: 'IT', days: 2 },
    { code: 'JP', days: 5 },
  ]

  it('groups countries by continent', () => {
    expect([...continentsOf(countries)].sort()).toEqual(['AS', 'EU'])
    expect(codesInContinent(countries, 'EU')).toEqual(['FR', 'IT'])
  })

  it('works out the share of the countries people can pick', () => {
    expect(shareOfWorld(COUNTRIES.length)).toBe(100)
    expect(shareOfWorld(12)).toBe(Math.round((12 / COUNTRIES.length) * 100))
  })

  it('knows the continent of every country', () => {
    const missing = COUNTRIES.map((c) => c.code).filter(
      (code) => !CONTINENT_BY_COUNTRY[code]
    )

    expect(missing).toEqual([])
  })
})

describe('shadeIndex', () => {
  it.each([
    [1, 0],
    [3, 0],
    [4, 1],
    [8, 2],
    [14, 2],
    [15, 3],
    [120, 3],
  ])('puts %i days in step %i', (days, step) => {
    expect(shadeIndex(days)).toBe(step)
  })
})

describe('fitView', () => {
  it('zooms in on a group of countries and keeps the map shape', () => {
    const view = fitView(world, ['ES', 'FR', 'IT'].map(shapeOf))!

    expect(view.width).toBeLessThan(world.view.width / 3)
    expect(view.width / view.height).toBeCloseTo(
      world.view.width / world.view.height
    )
    for (const code of ['ES', 'FR', 'IT']) {
      expect(
        within(shapeOf(code).bounds, [
          [view.x, view.y],
          [view.x + view.width, view.y + view.height],
        ])
      ).toBe(true)
    }
  })

  it('shows the whole world when the countries span it', () => {
    expect(fitView(world, ['US', 'AU', 'RU'].map(shapeOf))).toBeNull()
  })
})

describe('getMapScene', () => {
  const countries = [
    { code: 'FR', days: 7 },
    { code: 'SG', days: 3 },
    { code: 'MT', days: 2 },
  ]

  it('draws countries too small to see as dots', () => {
    const scene = getMapScene(world, countries, null)

    expect(scene.view).toEqual(world.view)
    expect(scene.dots.map((dot) => dot.code).sort()).toEqual(['MT', 'SG'])
    expect(scene.tileByCode.get('FR')).toEqual(shapeOf('FR').bounds)
  })

  it('zooms to the focused countries and shrinks the dots with the view', () => {
    const world_ = getMapScene(world, countries, null)
    const europe = getMapScene(world, countries, ['FR', 'MT'])

    expect(europe.view.width).toBeLessThan(world.view.width)
    expect(europe.dotRadius).toBeLessThan(world_.dotRadius)
    expect(europe.dots.map((dot) => dot.code)).not.toContain('FR')
  })
})
