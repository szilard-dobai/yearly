import { geoEqualEarth, geoPath } from 'd3-geo'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import { COUNTRIES } from './countries'
import { ISO_NUMERIC } from './iso-numeric'
import type { DayMap } from './trips'

export const MAP_WIDTH = 960

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
  viewBox: string
}

export interface CountryDays {
  code: string
  days: number
}

type CountryFeature = Feature<Polygon | MultiPolygon, { name: string }>

const CODE_BY_NUMERIC = Object.fromEntries(
  Object.entries(ISO_NUMERIC).map(([alpha2, numeric]) => [numeric, alpha2])
)

const ANTARCTICA = '010'

let worldPromise: Promise<World> | null = null

export function projectWorld(topology: unknown): World {
  const typed = topology as Topology<{
    countries: GeometryCollection<{ name: string }>
  }>
  const collection = feature(
    typed,
    typed.objects.countries
  ) as FeatureCollection<Polygon | MultiPolygon, { name: string }>
  const features = collection.features.filter((f) => f.id !== ANTARCTICA)
  const land = { type: 'FeatureCollection' as const, features }
  const path = geoPath(geoEqualEarth().fitWidth(MAP_WIDTH, land))
  const [[, y0], [, y1]] = path.bounds(land)

  const shapes = features.map((f: CountryFeature): MapShape => {
    const code =
      (f.id !== undefined && CODE_BY_NUMERIC[String(f.id)]) ||
      (f.properties.name === 'Kosovo' ? 'XK' : null)
    let bounds = path.bounds(f)
    if (f.geometry.type === 'MultiPolygon') {
      let largest = 0
      for (const coordinates of f.geometry.coordinates) {
        const polygon: Polygon = { type: 'Polygon', coordinates }
        const area = path.area(polygon)
        if (area > largest) {
          largest = area
          bounds = path.bounds(polygon)
        }
      }
    }
    return {
      code,
      name: f.properties.name,
      d: path(f) ?? '',
      area: path.area(f),
      centroid: path.centroid(f),
      bounds,
    }
  })
  return {
    shapes,
    viewBox: `0 ${Math.floor(y0)} ${MAP_WIDTH} ${Math.ceil(y1 - y0)}`,
  }
}

export function loadWorld(): Promise<World> {
  worldPromise ??= import('world-atlas/countries-50m.json').then((mod) =>
    projectWorld(mod.default ?? mod)
  )
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
    .sort((a, b) => b.days - a.days)
}

export function shareOfWorld(countryCount: number) {
  return Math.round((countryCount / COUNTRIES.length) * 100)
}

export function fitView(worldViewBox: string, shapes: MapShape[]) {
  if (shapes.length === 0) return null
  const [, worldY, worldW, worldH] = worldViewBox.split(' ').map(Number)
  const aspect = worldW / worldH
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const { bounds } of shapes) {
    x0 = Math.min(x0, bounds[0][0])
    y0 = Math.min(y0, bounds[0][1])
    x1 = Math.max(x1, bounds[1][0])
    y1 = Math.max(y1, bounds[1][1])
  }
  let w = Math.max((x1 - x0) * 1.3, 180)
  let h = Math.max((y1 - y0) * 1.3, 180 / aspect)
  if (w / h > aspect) h = w / aspect
  else w = h * aspect
  if (w >= worldW) return null
  const clamp = (v: number, min: number, max: number) =>
    Math.min(Math.max(v, min), max)
  const x = clamp((x0 + x1) / 2 - w / 2, 0, worldW - w)
  const y = clamp((y0 + y1) / 2 - h / 2, worldY, worldY + worldH - h)
  return { viewBox: `${x} ${y} ${w} ${h}`, scale: w / worldW }
}

export const SHADE_STEPS = [
  {
    min: 1,
    label: '1–3 days',
    className: 'fill-[#9ec5f4] dark:fill-[#184f95]',
  },
  { min: 4, label: '4–7', className: 'fill-[#6da7ec] dark:fill-[#2a78d6]' },
  { min: 8, label: '8–14', className: 'fill-[#2a78d6] dark:fill-[#5598e7]' },
  { min: 15, label: '15+', className: 'fill-[#184f95] dark:fill-[#9ec5f4]' },
] as const

export interface MapPalette {
  empty: string
  stroke: string
  shade: readonly [string, string, string, string]
}

export const EXPORT_MAP_PALETTE: Record<'light' | 'dark', MapPalette> = {
  light: {
    empty: '#e4e4e7',
    stroke: '#ffffff',
    shade: ['#9ec5f4', '#6da7ec', '#2a78d6', '#184f95'],
  },
  dark: {
    empty: '#27272a',
    stroke: '#000000',
    shade: ['#184f95', '#2a78d6', '#5598e7', '#9ec5f4'],
  },
}

export function shadeIndex(days: number) {
  return SHADE_STEPS.reduce(
    (index, step, i) => (days >= step.min ? i : index),
    0
  )
}

export function shadeClass(days: number) {
  return [...SHADE_STEPS].reverse().find((step) => days >= step.min)!.className
}
