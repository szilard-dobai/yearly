import { Button } from '@/components/ui/button'
import { BarChart3, XCircle, Loader2 } from 'lucide-react'
import { useStatisticsExport } from '@/lib/hooks/useStatisticsExport'
import type { CalendarData } from '@/lib/types'
import ImagePreviewModal from './ImagePreviewModal'

interface StatisticsExportButtonProps {
  calendarData: CalendarData
  year: number
}

export default function StatisticsExportButton({
  calendarData,
  year,
}: StatisticsExportButtonProps) {
  const {
    exportStatistics,
    status,
    previewOpen,
    setPreviewOpen,
    imageDataUrl,
    filename,
    format,
    changeFormat,
  } = useStatisticsExport({ calendarData, year })

  const isDisabled = status === 'loading'

  return (
    <>
      <Button
        onClick={exportStatistics}
        disabled={isDisabled}
        className="w-full"
        variant={status === 'error' ? 'destructive' : 'cta'}
        size="lg"
        aria-label="Download statistics as JPEG image"
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
            <BarChart3 className="size-5" />
            Download Statistics
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
        exportType="statistics"
        format={format}
        onFormatChange={changeFormat}
        isRendering={status === 'loading'}
      />
    </>
  )
}
