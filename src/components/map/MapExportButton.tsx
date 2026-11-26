'use client'

import ImagePreviewModal from '@/components/ImagePreviewModal'
import { Button } from '@/components/ui/button'
import { useMapExport, type MapExportView } from '@/lib/hooks/useMapExport'
import type { MapExportSource } from '@/lib/tracking/types'
import type { CalendarData } from '@/lib/types'
import { Globe2, Loader2, XCircle } from 'lucide-react'

interface MapExportButtonProps extends MapExportView {
  calendarData: CalendarData
  previewYear: number
  source: MapExportSource
  variant?: 'cta' | 'default'
}

export default function MapExportButton({
  calendarData,
  previewYear,
  source,
  variant = 'cta',
  ...view
}: MapExportButtonProps) {
  const {
    exportMap,
    status,
    previewOpen,
    setPreviewOpen,
    imageDataUrl,
    filename,
    format,
    changeFormat,
  } = useMapExport({ ...view, source })

  return (
    <>
      <Button
        onClick={exportMap}
        disabled={status === 'loading' || view.countries.length === 0}
        className="w-full"
        variant={status === 'error' ? 'destructive' : variant}
        size="lg"
        aria-label="Download map as JPEG image"
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            Generating...
          </>
        ) : status === 'error' ? (
          <>
            <XCircle className="size-5" />
            Export Failed
          </>
        ) : (
          <>
            <Globe2 className="size-5" />
            Download Map
          </>
        )}
      </Button>

      <ImagePreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        imageDataUrl={imageDataUrl}
        filename={filename}
        year={previewYear}
        calendarData={calendarData}
        exportType="map"
        format={format}
        onFormatChange={changeFormat}
        isRendering={status === 'loading'}
      />
    </>
  )
}
