'use client'

import { useState } from 'react'
import { loadCalendarData } from '../lib/storage'

/**
 * DeveloperMode Component
 * JSON viewer with copy-to-clipboard functionality for debugging and data inspection
 */
export default function DeveloperMode() {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>(
    'idle'
  )

  const handleCopyToClipboard = async () => {
    try {
      const data = loadCalendarData()
      const jsonString = JSON.stringify(data, null, 2)

      await navigator.clipboard.writeText(jsonString)
      setCopyStatus('success')
      setTimeout(() => setCopyStatus('idle'), 3000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      setCopyStatus('error')
      setTimeout(() => setCopyStatus('idle'), 3000)
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
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <span className="font-medium">{visitCount}</span> visit
          {visitCount !== 1 ? 's' : ''} in local storage
        </div>
        <button
          onClick={handleCopyToClipboard}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${buttonClassName}`}
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
  )
}
