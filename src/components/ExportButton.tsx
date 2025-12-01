import type { CalendarData } from '../lib/types'
import { exportToJSON } from '../lib/storage'
import { trackEvent } from '@/lib/tracking'
import { useStatusFeedback } from '@/lib/hooks/useStatusFeedback'
import { Button } from '@/components/ui/button'
import { Download, CheckCircle2, XCircle } from 'lucide-react'

interface ExportButtonProps {
  calendarData: CalendarData
  filename?: string
}

export default function ExportButton({
  calendarData,
  filename,
}: ExportButtonProps) {
  const { status, setSuccess, setError } = useStatusFeedback()

  const handleExport = () => {
    try {
      const json = exportToJSON(calendarData)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const defaultFilename = `countries-in-year-${new Date().toISOString().split('T')[0]}.json`
      const finalFilename = filename || defaultFilename

      const link = document.createElement('a')
      link.href = url
      link.download = finalFilename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      URL.revokeObjectURL(url)

      trackEvent('json_export', {
        visitCount: calendarData.visits.length,
        success: true,
      })

      setSuccess()
    } catch (error) {
      console.error('Export failed:', error)

      trackEvent('json_export', {
        visitCount: calendarData.visits.length,
        success: false,
      })

      setError()
    }
  }

  const hasData = calendarData.visits.length > 0

  return (
    <Button
      onClick={handleExport}
      disabled={!hasData || status !== 'idle'}
      variant={
        status === 'success'
          ? 'default'
          : status === 'error'
            ? 'destructive'
            : 'default'
      }
      aria-label={
        hasData ? 'Export calendar data as JSON' : 'No data to export'
      }
    >
      {status === 'success' ? (
        <>
          <CheckCircle2 className="size-4" />
          Exported!
        </>
      ) : status === 'error' ? (
        <>
          <XCircle className="size-4" />
          Export failed
        </>
      ) : (
        <>
          <Download className="size-4" />
          Export as JSON
        </>
      )}
    </Button>
  )
}
