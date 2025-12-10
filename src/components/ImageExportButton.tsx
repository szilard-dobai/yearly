import { RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { Image as ImageIcon, XCircle, Loader2 } from 'lucide-react'
import { useImageExport } from '@/lib/hooks/useImageExport'
import type { CalendarData } from '@/lib/types'
import ImagePreviewModal from './ImagePreviewModal'

interface ImageExportButtonProps {
  calendarRef: RefObject<HTMLDivElement | null>
  calendarData: CalendarData
  year: number
  hasData: boolean
}

export default function ImageExportButton({
  calendarRef,
  calendarData,
  year,
  hasData,
}: ImageExportButtonProps) {
  const {
    exportImage,
    status,
    previewOpen,
    setPreviewOpen,
    imageDataUrl,
    filename,
  } = useImageExport({ calendarRef, calendarData, year })

  const isDisabled = !hasData || status === 'loading'

  return (
    <>
      <Button
        onClick={exportImage}
        disabled={isDisabled}
        className="w-full"
        variant={status === 'error' ? 'destructive' : 'cta'}
        size="lg"
        aria-label={
          hasData ? 'Export calendar as JPEG image' : 'No data to export'
        }
      >
        {status === 'loading' ? (
          <>
            <Loader2 className="size-5 animate-spin" />
            Generating Image...
          </>
        ) : status === 'error' ? (
          <>
            <XCircle className="size-5" />
            Export Failed
          </>
        ) : (
          <>
            <ImageIcon className="size-5" />
            Download as Image
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
