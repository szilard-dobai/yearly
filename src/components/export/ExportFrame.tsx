import {
  EXPORT_CANVAS,
  EXPORT_FRAME,
  EXPORT_WATERMARK_LINE,
  getExportContentBox,
  type ExportFormat,
} from '@/lib/export-canvas'
import type { ReactNode } from 'react'
import ExportWatermark from '../ExportWatermark'

interface ExportFrameProps {
  format: ExportFormat
  title: string
  children: ReactNode
}

export default function ExportFrame({
  format,
  title,
  children,
}: ExportFrameProps) {
  const { width, height } = EXPORT_CANVAS[format]
  const content = getExportContentBox(format)

  return (
    <div
      data-export-canvas={format}
      className="flex flex-col box-border text-gray-900 dark:text-white"
      style={{ width, height, padding: EXPORT_FRAME.padding }}
    >
      <h2
        className="font-bold text-red-500 border-b border-gray-200 dark:border-white/10 whitespace-nowrap"
        style={{
          fontSize: EXPORT_FRAME.titleSize,
          lineHeight: `${EXPORT_FRAME.titleSize}px`,
          paddingBottom: EXPORT_FRAME.titleGap,
          borderBottomWidth: EXPORT_FRAME.divider,
          marginBottom: EXPORT_FRAME.headerGap,
        }}
      >
        {title}
      </h2>
      <div
        className="relative flex flex-col"
        style={{ width: content.width, height: content.height }}
      >
        {children}
      </div>
      <div
        className="border-t border-gray-200 dark:border-white/10"
        style={{
          marginTop: EXPORT_FRAME.watermarkGap,
          paddingTop: EXPORT_FRAME.watermarkGap,
          borderTopWidth: EXPORT_FRAME.divider,
          fontSize: EXPORT_FRAME.watermarkSize,
          height:
            EXPORT_FRAME.watermarkGap +
            EXPORT_FRAME.divider +
            EXPORT_WATERMARK_LINE,
        }}
      >
        <ExportWatermark />
      </div>
    </div>
  )
}
