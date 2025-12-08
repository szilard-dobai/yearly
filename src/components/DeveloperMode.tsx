'use client'

import { loadCalendarData } from '@/lib/storage'
import { useStatusFeedback } from '@/lib/hooks/useStatusFeedback'
import ExportButton from './ExportButton'
import ImportButton from './ImportButton'
import type { CalendarData } from '@/lib/types'

/**
 * DeveloperMode Component
 * JSON viewer with copy-to-clipboard functionality for debugging and data inspection
 */
interface DeveloperModeProps {
  calendarData: CalendarData
  year: number
  onDataChange: (data: CalendarData) => void
}

export default function DeveloperMode({
  calendarData,
  year,
  onDataChange,
}: DeveloperModeProps) {
  const { status: copyStatus, setSuccess, setError } = useStatusFeedback()

  const handleCopyToClipboard = async () => {
    try {
      const data = loadCalendarData()
      const jsonString = JSON.stringify(data, null, 2)

      await navigator.clipboard.writeText(jsonString)
      setSuccess()
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      setError()
    }
  }

  // Only load data in browser environment
  const data =
    typeof window !== 'undefined' ? loadCalendarData() : { visits: [] }
  const jsonString = JSON.stringify(data, null, 2)
  const visitCount = data?.visits?.length || 0

  const buttonText =
    copyStatus === 'success'
      ? 'Copied!'
      : copyStatus === 'error'
        ? 'Copy failed'
        : 'Copy to Clipboard'

  const buttonClassName =
    copyStatus === 'success'
      ? 'bg-green-600 text-white'
      : copyStatus === 'error'
        ? 'bg-red-600 text-white'
        : 'bg-blue-600 hover:bg-blue-700 text-white'

  return (
    <div className="space-y-4">
      <div className="space-y-2 pb-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Data Management
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Export or import your calendar data as JSON
        </p>
        <div className="flex gap-2">
          <ExportButton calendarData={calendarData} year={year} />
          <ImportButton
            currentData={calendarData}
            onImport={onDataChange}
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">{visitCount}</span> visit
            {visitCount !== 1 ? 's' : ''} in local storage
          </div>
          <button
            onClick={handleCopyToClipboard}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors cursor-pointer ${buttonClassName}`}
            aria-label="Copy JSON data to clipboard"
          >
            {buttonText}
          </button>
        </div>
        <div className="relative">
          <pre className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 overflow-x-auto text-xs font-mono text-gray-800 dark:text-gray-200 max-h-96 overflow-y-auto">
            {jsonString}
          </pre>
        </div>
      </div>
    </div>
  )
}
