import { RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { Calendar, XCircle, Loader2 } from 'lucide-react'
import { useImageExport } from '@/lib/hooks/useImageExport'
import type { CalendarData } from '@/lib/types'
import ImagePreviewModal from './ImagePreviewModal'

interface CalendarExportButtonProps {
  calendarRef: RefObject<HTMLDivElement | null>
  calendarData: CalendarData
  year: number
}

export default function CalendarExportButton({
  calendarRef,
  calendarData,
  year,
}: CalendarExportButtonProps) {
  const {
    exportImage,
    status,
    previewOpen,
    setPreviewOpen,
    imageDataUrl,
    filename,
  } = useImageExport({ calendarRef, calendarData, year })

  const isDisabled = status === 'loading'

  return (
    <>
      <Button
        onClick={exportImage}
        disabled={isDisabled}
        className="w-full"
        variant={status === 'error' ? 'destructive' : 'cta'}
        size="lg"
        aria-label="Download calendar as JPEG image"
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
            <Calendar className="size-5" />
            Download Calendar
          </>
        )}
      </Button>

      <ImagePreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        imageDataUrl={imageDataUrl}
        filename={filename}
        year={year}
        calendarData={calendarData}
      />
    </>
  )
}
