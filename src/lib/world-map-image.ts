import { getFlatFlagImageSrc } from './emoji'
import {
  FADED_OPACITY,
  getMapScene,
  shadeIndex,
  SOLID_FLAG_FILLS,
  STRIPED_FLAGS,
  type CountryDays,
  type MapColours,
  type MapMode,
  type MapShape,
  type World,
} from './world-map'

const MAX_TILE_SIZE = 2048
const COUNTRY_STROKE = 1
const OUTLINE_STROKE = 1.5
const DOT_STROKE = 2

interface MapImageOptions {
  world: World
  countries: CountryDays[]
  mode: MapMode
  focusCodes: string[] | null
  frameAspect?: number
  colours: MapColours
  stroke: string
  width: number
  pixelRatio: number
}

export interface MapImage {
  src: string
  width: number
  height: number
}

async function loadImage(src: string) {
  const image = new Image()
  image.src = src
  await image.decode()
  return image
}

async function loadFlags(codes: string[]) {
  const entries = await Promise.all(
    codes.map(async (code) => {
      const src = getFlatFlagImageSrc(code)
      const image = src ? await loadImage(src).catch(() => null) : null
      return [code, image] as const
    })
  )
  return new Map(
    entries.filter((entry): entry is [string, HTMLImageElement] =>
      Boolean(entry[1])
    )
  )
}

function coverRect(image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(
    width / image.naturalWidth,
    height / image.naturalHeight
  )
  const w = image.naturalWidth * scale
  const h = image.naturalHeight * scale
  return { x: (width - w) / 2, y: (height - h) / 2, width: w, height: h }
}

function flagTile(
  image: HTMLImageElement,
  bounds: MapShape['bounds'],
  pixelsPerUnit: number,
  stretch: boolean
) {
  const [[x0, y0], [x1, y1]] = bounds
  const units = {
    width: Math.max(x1 - x0, 0.01),
    height: Math.max(y1 - y0, 0.01),
  }
  const fit = Math.min(
    1,
    MAX_TILE_SIZE / (Math.max(units.width, units.height) * pixelsPerUnit)
  )
  const tile = document.createElement('canvas')
  tile.width = Math.max(1, Math.round(units.width * pixelsPerUnit * fit))
  tile.height = Math.max(1, Math.round(units.height * pixelsPerUnit * fit))
  const context = tile.getContext('2d')!
  context.imageSmoothingQuality = 'high'
  const rect = stretch
    ? { x: 0, y: 0, width: tile.width, height: tile.height }
    : coverRect(image, tile.width, tile.height)
  context.drawImage(image, rect.x, rect.y, rect.width, rect.height)
  return {
    tile,
    transform: new DOMMatrix([
      units.width / tile.width,
      0,
      0,
      units.height / tile.height,
      x0,
      y0,
    ]),
  }
}

export async function renderMapImage({
  world,
  countries,
  mode,
  focusCodes,
  frameAspect,
  colours,
  stroke,
  width,
  pixelRatio,
}: MapImageOptions): Promise<MapImage> {
  const scene = getMapScene(world, countries, focusCodes, frameAspect)
  const { view } = scene
  const height = Math.round((width * view.height) / view.width)
  const flags =
    mode === 'flags'
      ? await loadFlags(countries.map((c) => c.code))
      : new Map<string, HTMLImageElement>()

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * pixelRatio)
  canvas.height = Math.round(height * pixelRatio)
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available')
  const pixelsPerUnit = canvas.width / view.width
  const tiles: HTMLCanvasElement[] = []
  const patterns = new Map<string, CanvasPattern | null>()

  const flagPattern = (code: string) => {
    if (!patterns.has(code)) {
      const image = flags.get(code)
      const bounds = scene.tileByCode.get(code)
      let pattern: CanvasPattern | null = null
      if (image && bounds) {
        const { tile, transform } = flagTile(
          image,
          bounds,
          pixelsPerUnit,
          STRIPED_FLAGS.has(code)
        )
        tiles.push(tile)
        pattern = context.createPattern(tile, 'repeat')
        pattern?.setTransform(transform)
      }
      patterns.set(code, pattern)
    }
    return patterns.get(code)
  }

  const fill = (code: string) => {
    const days = scene.daysByCode.get(code) ?? 0
    const shade = colours.shade[shadeIndex(days)]
    if (mode !== 'flags') return shade
    return SOLID_FLAG_FILLS.get(code) ?? flagPattern(code) ?? shade
  }

  context.setTransform(
    pixelsPerUnit,
    0,
    0,
    pixelsPerUnit,
    -view.x * pixelsPerUnit,
    -view.y * pixelsPerUnit
  )
  context.imageSmoothingQuality = 'high'
  context.lineJoin = 'round'
  context.strokeStyle = stroke

  const outlines = scene.shapes
    .filter((shape) => shape.d)
    .map((shape) => ({ shape, path: new Path2D(shape.d) }))
  const alpha = (code: string | null) =>
    code && scene.faded.has(code) ? FADED_OPACITY : 1
  for (const { shape, path } of outlines) {
    const visited = shape.code !== null && scene.daysByCode.has(shape.code)
    context.fillStyle = visited ? fill(shape.code!) : colours.empty
    context.globalAlpha = alpha(shape.code)
    context.fill(path)
  }
  context.globalAlpha = 1
  context.lineWidth = (COUNTRY_STROKE * pixelRatio) / pixelsPerUnit
  for (const { path } of outlines) context.stroke(path)

  if (mode === 'flags') {
    context.strokeStyle = colours.outline
    context.lineWidth = (OUTLINE_STROKE * pixelRatio) / pixelsPerUnit
    for (const { shape, path } of outlines) {
      if (!shape.code || !scene.daysByCode.has(shape.code)) continue
      context.globalAlpha = alpha(shape.code)
      context.stroke(path)
    }
    context.globalAlpha = 1
  }

  context.lineWidth = (DOT_STROKE * pixelRatio) / pixelsPerUnit
  for (const dot of scene.dots) {
    const [cx, cy] = dot.centroid
    const r = scene.dotRadius
    const circle = new Path2D()
    circle.arc(cx, cy, r, 0, Math.PI * 2)
    const image = mode === 'flags' ? flags.get(dot.code!) : undefined
    context.globalAlpha = alpha(dot.code)
    if (image) {
      context.save()
      context.clip(circle)
      const rect = coverRect(image, r * 2, r * 2)
      context.drawImage(
        image,
        cx - r + rect.x,
        cy - r + rect.y,
        rect.width,
        rect.height
      )
      context.restore()
    } else {
      context.fillStyle = fill(dot.code!)
      context.fill(circle)
    }
    context.stroke(circle)
  }
  context.globalAlpha = 1

  const src = canvas.toDataURL('image/png')
  for (const released of [canvas, ...tiles]) {
    released.width = 0
    released.height = 0
  }
  return { src, width, height }
}
