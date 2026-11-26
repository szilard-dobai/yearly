import { geoEqualEarth, geoPath, type GeoProjection } from 'd3-geo'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { feature, merge } from 'topojson-client'
import type {
  GeometryCollection,
  GeometryObject,
  MultiPolygon as TopoMultiPolygon,
  Polygon as TopoPolygon,
  Topology,
} from 'topojson-specification'
import { ISO_NUMERIC } from './iso-numeric'
import { MAP_WIDTH, type MapShape, type World } from './world-map'

const ANTARCTICA = '010'
const RUSSIA = '643'
const UKRAINE = '804'
const CRIMEA_BOX = { west: 32, east: 37, south: 44, north: 46.5 }

const POINTS_WITHOUT_OUTLINE: Record<string, [number, number]> = {
  TV: [179.2, -8.5],
}

type CountryFeature = Feature<Polygon | MultiPolygon, { name: string }>
type CountryTopology = Topology<{
  countries: GeometryCollection<{ name: string }>
}>
type CountryGeometry = GeometryObject<{ name: string }>

const CODE_BY_NUMERIC = new Map(
  Object.entries(ISO_NUMERIC).map(([alpha2, numeric]) => [numeric, alpha2])
)

function shapeCode(f: CountryFeature) {
  if (f.properties.name === 'Kosovo') return 'XK'
  return (f.id !== undefined && CODE_BY_NUMERIC.get(String(f.id))) || null
}

function inCrimeaBox(topology: CountryTopology, arcs: number[][]) {
  const polygon = feature(topology, { type: 'Polygon', arcs }).geometry
  return polygon.coordinates[0].every(
    ([lon, lat]) =>
      lon > CRIMEA_BOX.west &&
      lon < CRIMEA_BOX.east &&
      lat > CRIMEA_BOX.south &&
      lat < CRIMEA_BOX.north
  )
}

function asPolygons(geometry: CountryGeometry): number[][][] {
  if (geometry.type === 'Polygon') return [geometry.arcs]
  if (geometry.type === 'MultiPolygon') return geometry.arcs
  return []
}

export function countryFeatures(topology: unknown): CountryFeature[] {
  const typed = topology as CountryTopology
  const geometries = typed.objects.countries.geometries
  const russia = geometries.find((g) => g.id === RUSSIA)
  const ukraine = geometries.find((g) => g.id === UKRAINE)
  const russiaPolygons = russia ? asPolygons(russia) : []
  const crimea = ukraine
    ? russiaPolygons.filter((arcs) => inCrimeaBox(typed, arcs))
    : []

  const others = geometries
    .filter((g) => !(crimea.length && g === ukraine))
    .map((g) =>
      crimea.length && g === russia
        ? {
            ...g,
            type: 'MultiPolygon' as const,
            arcs: russiaPolygons.filter((arcs) => !crimea.includes(arcs)),
          }
        : g
    )
  const features = (
    feature(typed, {
      type: 'GeometryCollection',
      geometries: others,
    }) as FeatureCollection<Polygon | MultiPolygon, { name: string }>
  ).features
  if (!crimea.length || !ukraine) return features

  const merged = merge(typed, [
    ukraine as TopoPolygon | TopoMultiPolygon,
    ...crimea.map((arcs): TopoPolygon => ({ type: 'Polygon', arcs })),
  ])
  return [
    ...features,
    {
      type: 'Feature',
      id: ukraine.id,
      properties: ukraine.properties as { name: string },
      geometry: merged,
    },
  ]
}

type Point = [number, number]

function largestPiece(projection: GeoProjection, f: CountryFeature) {
  const rings: Point[][] = []
  geoPath(projection, {
    beginPath: () => {},
    moveTo: (x, y) => void rings.push([[x, y]]),
    lineTo: (x, y) => void rings.at(-1)?.push([x, y]),
    closePath: () => {},
    arc: () => {},
  })(f)

  let largest = { area: 0, ring: rings[0] ?? [] }
  for (const ring of rings) {
    let twiceArea = 0
    for (let i = 0; i < ring.length; i++) {
      const [x0, y0] = ring[i]
      const [x1, y1] = ring[(i + 1) % ring.length]
      twiceArea += x0 * y1 - x1 * y0
    }
    const area = Math.abs(twiceArea) / 2
    if (area > largest.area) largest = { area, ring }
  }
  const xs = largest.ring.map(([x]) => x)
  const ys = largest.ring.map(([, y]) => y)
  return {
    area: largest.area,
    bounds: [
      [Math.min(...xs), Math.min(...ys)],
      [Math.max(...xs), Math.max(...ys)],
    ] as [Point, Point],
  }
}

function frame(top: number, bottom: number) {
  const y = Math.floor(top)
  return { x: 0, y, width: MAP_WIDTH, height: Math.ceil(bottom) - y }
}

export function projectWorld(topology: unknown): World {
  const features = countryFeatures(topology)
  const land = {
    type: 'FeatureCollection' as const,
    features: features.filter((f) => f.id !== ANTARCTICA),
  }
  const projection = geoEqualEarth().fitWidth(MAP_WIDTH, land)
  const path = geoPath(projection)
  const [[, y0], [, y1]] = path.bounds(land)
  const [, [, bottom]] = path.bounds({
    type: 'FeatureCollection',
    features,
  })

  const shapes = features.map((f: CountryFeature): MapShape => {
    const piece = largestPiece(projection, f)
    const [[x0], [x1]] = path.bounds(f)
    const wrapsAround =
      x1 - x0 > MAP_WIDTH / 2 &&
      piece.bounds[1][0] - piece.bounds[0][0] < MAP_WIDTH / 2
    return {
      code: shapeCode(f),
      name: f.properties.name,
      d: path(f) ?? '',
      area: path.area(f),
      centroid: wrapsAround
        ? [
            (piece.bounds[0][0] + piece.bounds[1][0]) / 2,
            (piece.bounds[0][1] + piece.bounds[1][1]) / 2,
          ]
        : path.centroid(f),
      bounds: piece.bounds,
      onlyWhenVisited: f.id === ANTARCTICA,
    }
  })

  const outlined = new Set(shapes.map((shape) => shape.code))
  for (const [code, point] of Object.entries(POINTS_WITHOUT_OUTLINE)) {
    const projected = projection(point)
    if (outlined.has(code) || !projected) continue
    shapes.push({
      code,
      name: code,
      d: '',
      area: 0,
      centroid: projected,
      bounds: [projected, projected],
      onlyWhenVisited: false,
    })
  }

  return { shapes, view: frame(y0, y1), fullView: frame(y0, bottom) }
}
