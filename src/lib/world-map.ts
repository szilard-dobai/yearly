import { CONTINENT_BY_COUNTRY, type ContinentCode } from './continents'
import { COUNTRIES } from './countries'
import type { DayMap } from './trips'

export const MAP_WIDTH = 960

const TINY_AREA = 24
const DOT_RADIUS = 5

export const CONTINENT_ORDER: ContinentCode[] = [
  'EU',
  'AS',
  'NA',
  'SA',
  'AF',
  'OC',
  'AN',
]

export interface MapView {
  x: number
  y: number
  width: number
  height: number
}

export interface MapShape {
  code: string | null
  name: string
  d: string
  area: number
  centroid: [number, number]
  bounds: [[number, number], [number, number]]
}

export interface World {
  shapes: MapShape[]
  view: MapView
}

export interface CountryDays {
  code: string
  days: number
}

export type MapMode = 'flags' | 'shade'

let worldPromise: Promise<World> | null = null

export function loadWorld(): Promise<World> {
  if (!worldPromise) {
    worldPromise = Promise.all([
      import('./world-map-projection'),
      import('world-atlas/countries-50m.json'),
    ]).then(([{ projectWorld }, topology]) =>
      projectWorld(topology.default ?? topology)
    )
    worldPromise.catch(() => {
      worldPromise = null
    })
  }
  return worldPromise
}

export function countriesInScope(
  dayMap: DayMap,
  year: number | null
): CountryDays[] {
  const counts = new Map<string, number>()
  for (const [key, codes] of dayMap) {
    if (year !== null && !key.startsWith(`${year}-`)) continue
    for (const code of codes) counts.set(code, (counts.get(code) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([code, days]) => ({ code, days }))
    .sort((a, b) => b.days - a.days || a.code.localeCompare(b.code))
}

export function continentsOf(countries: CountryDays[]): Set<ContinentCode> {
  const continents = new Set<ContinentCode>()
  for (const { code } of countries) {
    const continent = CONTINENT_BY_COUNTRY[code]
    if (continent) continents.add(continent)
  }
  return continents
}

export function codesInContinent(
  countries: CountryDays[],
  continent: ContinentCode
): string[] {
  return countries
    .map((c) => c.code)
    .filter((code) => CONTINENT_BY_COUNTRY[code] === continent)
}

export function shareOfWorld(countryCount: number) {
  return Math.round((countryCount / COUNTRIES.length) * 100)
}

export function fitView(world: World, shapes: MapShape[]): MapView | null {
  if (shapes.length === 0) return null
  const full = world.view
  const aspect = full.width / full.height
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const { bounds } of shapes) {
    x0 = Math.min(x0, bounds[0][0])
    y0 = Math.min(y0, bounds[0][1])
    x1 = Math.max(x1, bounds[1][0])
    y1 = Math.max(y1, bounds[1][1])
  }
  let width = Math.max((x1 - x0) * 1.3, 180)
  let height = Math.max((y1 - y0) * 1.3, 180 / aspect)
  if (width / height > aspect) height = width / aspect
  else width = height * aspect
  if (width >= full.width) return null
  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max)
  return {
    x: clamp((x0 + x1) / 2 - width / 2, full.x, full.x + full.width - width),
    y: clamp((y0 + y1) / 2 - height / 2, full.y, full.y + full.height - height),
    width,
    height,
  }
}

export interface MapScene {
  view: MapView
  daysByCode: Map<string, number>
  tileByCode: Map<string, MapShape['bounds']>
  dots: MapShape[]
  dotRadius: number
}

export function getMapScene(
  world: World,
  countries: CountryDays[],
  focusCodes: string[] | null
): MapScene {
  const daysByCode = new Map(countries.map((c) => [c.code, c.days]))
  const largest = new Map<string, MapShape>()
  for (const shape of world.shapes) {
    if (!shape.code || !daysByCode.has(shape.code)) continue
    const current = largest.get(shape.code)
    if (!current || shape.area > current.area) largest.set(shape.code, shape)
  }
  const visited = [...largest.values()]
  const focused = focusCodes
    ? fitView(
        world,
        visited.filter((shape) => focusCodes.includes(shape.code!))
      )
    : null
  const view = focused ?? world.view
  const scale = view.width / world.view.width
  return {
    view,
    daysByCode,
    tileByCode: new Map(visited.map((shape) => [shape.code!, shape.bounds])),
    dots: visited.filter((shape) => shape.area < TINY_AREA * scale * scale),
    dotRadius: DOT_RADIUS * scale,
  }
}

export function viewBox({ x, y, width, height }: MapView) {
  return `${x} ${y} ${width} ${height}`
}

export const SHADE_STEPS = [
  { min: 1, label: '1–3 days' },
  { min: 4, label: '4–7' },
  { min: 8, label: '8–14' },
  { min: 15, label: '15+' },
] as const

export function shadeIndex(days: number) {
  return SHADE_STEPS.reduce(
    (index, step, i) => (days >= step.min ? i : index),
    0
  )
}

export interface MapColours {
  empty: string
  outline: string
  shade: readonly [string, string, string, string]
}

export const MAP_COLOURS: Record<'light' | 'dark', MapColours> = {
  light: {
    empty: '#e4e4e7',
    outline: '#a1a1aa',
    shade: ['#9ec5f4', '#6da7ec', '#2a78d6', '#184f95'],
  },
  dark: {
    empty: '#27272a',
    outline: '#71717a',
    shade: ['#184f95', '#2a78d6', '#5598e7', '#9ec5f4'],
  },
}
