'use client'

import ImagePreviewModal from '@/components/ImagePreviewModal'
import { Button } from '@/components/ui/button'
import { useMapExport } from '@/lib/hooks/useMapExport'
import type { CalendarData } from '@/lib/types'
import type { CountryDays } from '@/lib/world-map'
import { cn } from '@/lib/utils'
import { Globe2, Loader2, XCircle } from 'lucide-react'
import type { MapMode } from './WorldMap'

interface MapExportButtonProps {
  calendarData: CalendarData
  countries: CountryDays[]
  year: number | null
  mode: MapMode
  focusCodes?: string[] | null
  variant?: 'cta' | 'default'
  className?: string
}

export default function MapExportButton({
  calendarData,
  countries,
  year,
  mode,
  focusCodes = null,
  variant = 'cta',
  className,
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
  } = useMapExport({ countries, year, mode, focusCodes })

  return (
    <>
      <Button
        onClick={exportMap}
        disabled={status === 'loading' || countries.length === 0}
        className={cn('w-full', className)}
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
        year={year ?? new Date().getFullYear()}
        calendarData={calendarData}
        exportType="map"
        format={format}
        onFormatChange={changeFormat}
        isRendering={status === 'loading'}
      />
    </>
  )
}
