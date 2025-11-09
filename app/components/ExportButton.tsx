import { useState } from 'react'
import type { CalendarData } from '../lib/types'
import { exportToJSON } from '../lib/storage'

interface ExportButtonProps {
  calendarData: CalendarData
  filename?: string
}

export default function ExportButton({
  calendarData,
  filename,
}: ExportButtonProps) {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

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

      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (error) {
      console.error('Export failed:', error)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const hasData = calendarData.visits.length > 0
  const buttonText =
    status === 'success'
      ? 'Exported!'
      : status === 'error'
        ? 'Export failed'
        : 'Export as JSON'

  return (
    <button
      onClick={handleExport}
      disabled={!hasData || status !== 'idle'}
      className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
        !hasData
          ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
          : status === 'success'
            ? 'bg-green-600 text-white'
            : status === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
      }`}
      aria-label={
        hasData ? 'Export calendar data as JSON' : 'No data to export'
      }
    >
      {buttonText}
    </button>
  )
}
