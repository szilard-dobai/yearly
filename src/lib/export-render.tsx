import { toSvg } from 'html-to-image'
import { useEffect, type ReactElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { EXPORT_BACKGROUND } from './constants'
import {
  EXPORT_CANVAS,
  EXPORT_JPEG_QUALITY,
  EXPORT_PIXEL_RATIO,
  type ExportFormat,
} from './export-canvas'

const TRANSPARENT_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

interface PlacedImage {
  image: HTMLImageElement
  x: number
  y: number
  width: number
  height: number
  clip: [number, number][] | null
}

const loadedImages = new Map<string, Promise<HTMLImageElement>>()

function loadImage(src: string) {
  let pending = loadedImages.get(src)
  if (!pending) {
    const image = new Image()
    image.src = src
    pending = image.decode().then(() => image)
    pending.catch(() => loadedImages.delete(src))
    loadedImages.set(src, pending)
  }
  return pending
}

function parseLength(value: string, size: number) {
  return value.endsWith('%')
    ? (parseFloat(value) / 100) * size
    : parseFloat(value)
}

function parsePolygon(
  clipPath: string,
  width: number,
  height: number
): [number, number][] | null {
  const polygon = clipPath.match(/^polygon\((.*)\)$/)
  if (!polygon) return null
  return polygon[1].split(',').map((point) => {
    const [x, y] = point.trim().split(/\s+/)
    return [parseLength(x, width), parseLength(y, height)]
  })
}

// WebKit leaves images inside the html-to-image SVG blank, so they are hidden there and drawn onto the canvas directly
async function liftImages(root: HTMLElement): Promise<PlacedImage[]> {
  const origin = root.getBoundingClientRect()
  const placed = await Promise.all(
    [...root.querySelectorAll('img')].map(async (element) => {
      const rect = element.getBoundingClientRect()
      return {
        element,
        image: await loadImage(element.currentSrc || element.src),
        x: rect.left - origin.left,
        y: rect.top - origin.top,
        width: rect.width,
        height: rect.height,
        clip: parsePolygon(
          getComputedStyle(element).clipPath,
          rect.width,
          rect.height
        ),
      }
    })
  )
  return placed.map(({ element, ...image }) => {
    element.style.visibility = 'hidden'
    element.src = TRANSPARENT_PIXEL
    return image
  })
}

function drawImages(context: CanvasRenderingContext2D, images: PlacedImage[]) {
  context.imageSmoothingQuality = 'high'
  for (const { image, x, y, width, height, clip } of images) {
    context.save()
    context.scale(EXPORT_PIXEL_RATIO, EXPORT_PIXEL_RATIO)
    if (clip) {
      context.beginPath()
      clip.forEach(([px, py], index) =>
        index === 0
          ? context.moveTo(x + px, y + py)
          : context.lineTo(x + px, y + py)
      )
      context.closePath()
      context.clip()
    }
    context.drawImage(image, x, y, width, height)
    context.restore()
  }
}

async function drawExport(
  svg: string,
  images: PlacedImage[],
  width: number,
  height: number,
  background: string
) {
  const page = new Image()
  page.src = svg
  await page.decode()
  const canvas = document.createElement('canvas')
  canvas.width = width * EXPORT_PIXEL_RATIO
  canvas.height = height * EXPORT_PIXEL_RATIO
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available')
  context.fillStyle = background
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(page, 0, 0, canvas.width, canvas.height)
  drawImages(context, images)
  return canvas.toDataURL('image/jpeg', EXPORT_JPEG_QUALITY)
}

function Mounted({
  children,
  onMount,
}: {
  children: ReactNode
  onMount: () => void
}) {
  useEffect(onMount, [onMount])
  return children
}

export async function renderExportImage(
  layout: ReactElement,
  format: ExportFormat,
  theme: keyof typeof EXPORT_BACKGROUND
): Promise<string> {
  const { width, height } = EXPORT_CANVAS[format]
  const background = EXPORT_BACKGROUND[theme]
  const container = document.createElement('div')
  container.setAttribute('aria-hidden', 'true')
  container.setAttribute('translate', 'no')
  Object.assign(container.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: `${width}px`,
    height: `${height}px`,
    opacity: '0',
    pointerEvents: 'none',
    zIndex: '-1000',
    overflow: 'hidden',
  })
  document.body.appendChild(container)
  const root = createRoot(container)

  try {
    await new Promise<void>((resolve) =>
      root.render(<Mounted onMount={resolve}>{layout}</Mounted>)
    )
    await document.fonts?.ready
    await new Promise((resolve) => requestAnimationFrame(resolve))

    const canvas = container.firstElementChild
    if (!(canvas instanceof HTMLElement)) {
      throw new Error('Export layout did not render')
    }

    const images = await liftImages(canvas)
    const svg = await toSvg(canvas, {
      backgroundColor: background,
      width,
      height,
      skipFonts: true,
    })
    return await drawExport(svg, images, width, height, background)
  } finally {
    root.unmount()
    container.remove()
  }
}
