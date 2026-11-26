import { geoEqualEarth, geoPath } from 'd3-geo'
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
    .filter((g) => g.id !== ANTARCTICA && !(crimea.length && g === ukraine))
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

export function projectWorld(topology: unknown): World {
  const features = countryFeatures(topology)
  const land = { type: 'FeatureCollection' as const, features }
  const projection = geoEqualEarth().fitWidth(MAP_WIDTH, land)
  const path = geoPath(projection)
  const [[, y0], [, y1]] = path.bounds(land)

  const shapes = features.map((f: CountryFeature): MapShape => {
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
      code: shapeCode(f),
      name: f.properties.name,
      d: path(f) ?? '',
      area: path.area(f),
      centroid: path.centroid(f),
      bounds,
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
    })
  }

  return {
    shapes,
    view: {
      x: 0,
      y: Math.floor(y0),
      width: MAP_WIDTH,
      height: Math.ceil(y1) - Math.floor(y0),
    },
  }
}
