import { RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { BarChart3, XCircle, Loader2 } from 'lucide-react'
import { useStatisticsExport } from '@/lib/hooks/useStatisticsExport'
import type { CalendarData } from '@/lib/types'
import ImagePreviewModal from './ImagePreviewModal'

interface StatisticsExportButtonProps {
  statisticsRef: RefObject<HTMLDivElement | null>
  calendarData: CalendarData
  year: number
  hasData: boolean
}

export default function StatisticsExportButton({
  statisticsRef,
  calendarData,
  year,
  hasData,
}: StatisticsExportButtonProps) {
  const {
    exportStatistics,
    status,
    previewOpen,
    setPreviewOpen,
    imageDataUrl,
    filename,
  } = useStatisticsExport({ statisticsRef, calendarData, year })

  const isDisabled = !hasData || status === 'loading'

  return (
    <>
      <Button
        onClick={exportStatistics}
        disabled={isDisabled}
        className="w-full"
        variant={status === 'error' ? 'destructive' : 'cta'}
        size="lg"
        aria-label={
          hasData ? 'Download statistics as JPEG image' : 'No data to export'
        }
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
      />
    </>
  )
}
