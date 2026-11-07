import { toJpeg } from 'html-to-image'
import { useEffect, type ReactElement, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { EXPORT_BACKGROUND } from './constants'
import {
  EXPORT_CANVAS,
  EXPORT_JPEG_QUALITY,
  EXPORT_PIXEL_RATIO,
  type ExportFormat,
} from './export-canvas'

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

    return await toJpeg(canvas, {
      quality: EXPORT_JPEG_QUALITY,
      pixelRatio: EXPORT_PIXEL_RATIO,
      backgroundColor: background,
      cacheBust: true,
      width,
      height,
      skipFonts: true,
    })
  } finally {
    root.unmount()
    container.remove()
  }
}
