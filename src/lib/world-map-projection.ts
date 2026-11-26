import { geoEqualEarth, geoPath } from 'd3-geo'
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson'
import { feature } from 'topojson-client'
import type { GeometryCollection, Topology } from 'topojson-specification'
import { ISO_NUMERIC } from './iso-numeric'
import { MAP_WIDTH, type MapShape, type World } from './world-map'

const ANTARCTICA = '010'

const POINTS_WITHOUT_OUTLINE: Record<string, [number, number]> = {
  TV: [179.2, -8.5],
}

type CountryFeature = Feature<Polygon | MultiPolygon, { name: string }>

const CODE_BY_NUMERIC = new Map(
  Object.entries(ISO_NUMERIC).map(([alpha2, numeric]) => [numeric, alpha2])
)

function shapeCode(f: CountryFeature) {
  if (f.properties.name === 'Kosovo') return 'XK'
  return (f.id !== undefined && CODE_BY_NUMERIC.get(String(f.id))) || null
}

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
