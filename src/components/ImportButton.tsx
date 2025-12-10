import { useState, useRef } from 'react'
import type { CalendarData } from '../lib/types'
import { importFromJSON } from '../lib/storage'
import {
  calculateTotalCountriesVisited,
  calculateTotalVisits,
} from '../lib/statistics'
import { trackEvent } from '@/lib/tracking'
import { useStatusFeedback } from '@/lib/hooks/useStatusFeedback'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Upload, CheckCircle2, XCircle } from 'lucide-react'

interface ImportButtonProps {
  currentData: CalendarData
  onImport: (data: CalendarData) => void
  onError?: (error: Error) => void
}

type MergeStrategy = 'replace' | 'merge'

export default function ImportButton({
  currentData,
  onImport,
  onError,
}: ImportButtonProps) {
  const { status, setSuccess, setError, isIdle } = useStatusFeedback()
  const [showModal, setShowModal] = useState(false)
  const [importedData, setImportedData] = useState<CalendarData | null>(null)
  const [mergeStrategy, setMergeStrategy] = useState<MergeStrategy>('merge')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = importFromJSON(text)

      if (!data) {
        throw new Error('Invalid JSON format')
      }

      setImportedData(data)
      setShowModal(true)
    } catch (error) {
      console.error('Import failed:', error)
      setError()

      if (onError) {
        onError(error instanceof Error ? error : new Error('Import failed'))
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleConfirm = () => {
    if (!importedData) return

    try {
      if (mergeStrategy === 'replace') {
        onImport(importedData)
      } else {
        const existingIds = new Set(currentData.visits.map((v) => v.id))
        const newVisits = importedData.visits.filter(
          (visit) => !existingIds.has(visit.id)
        )

        const mergedData: CalendarData = {
          visits: [...currentData.visits, ...newVisits],
        }

        onImport(mergedData)
      }

      trackEvent('json_import', {
        strategy: mergeStrategy,
        importedVisitCount: importedData.visits.length,
        success: true,
      })

      setSuccess()
      setShowModal(false)
      setImportedData(null)
    } catch (error) {
      console.error('Import merge failed:', error)

      trackEvent('json_import', {
        strategy: mergeStrategy,
        importedVisitCount: importedData.visits.length,
        success: false,
      })

      setError()

      if (onError) {
        onError(
          error instanceof Error ? error : new Error('Import merge failed')
        )
      }
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setShowModal(false)
      setImportedData(null)
      setMergeStrategy('merge')
    }
  }

  const importedVisits = importedData
    ? calculateTotalVisits(importedData.visits)
    : 0
  const importedCountries = importedData
    ? calculateTotalCountriesVisited(importedData.visits)
    : 0
  const currentVisits = calculateTotalVisits(currentData.visits)
  const currentCountries = calculateTotalCountriesVisited(currentData.visits)

  const existingIds = new Set(currentData.visits.map((v) => v.id))
  const newVisitsCount = importedData
    ? importedData.visits.filter((visit) => !existingIds.has(visit.id)).length
    : 0
  const duplicatesCount = importedData
    ? importedData.visits.length - newVisitsCount
    : 0

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="Import calendar data file"
      />

      <Button
        onClick={() => fileInputRef.current?.click()}
        disabled={!isIdle}
        variant={
          status === 'success'
            ? 'default'
            : status === 'error'
              ? 'destructive'
              : 'outline'
        }
        aria-label="Import calendar data from JSON file"
      >
        {status === 'success' ? (
          <>
            <CheckCircle2 className="size-4" />
            Imported!
          </>
        ) : status === 'error' ? (
          <>
            <XCircle className="size-4" />
            Import failed
          </>
        ) : (
          <>
            <Upload className="size-4" />
            Import JSON
          </>
        )}
      </Button>

      <Dialog open={showModal && !!importedData} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Calendar Data</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                Imported Data
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                {importedVisits} {importedVisits === 1 ? 'visit' : 'visits'} •{' '}
                {importedCountries}{' '}
                {importedCountries === 1 ? 'country' : 'countries'}
              </p>
            </div>

            {currentVisits > 0 && (
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Current Data
                </h3>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {currentVisits} {currentVisits === 1 ? 'visit' : 'visits'} •{' '}
                  {currentCountries}{' '}
                  {currentCountries === 1 ? 'country' : 'countries'}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900 dark:text-white">
                Import Strategy
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${mergeStrategy === 'merge' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                <input
                  type="radio"
                  name="merge-strategy"
                  value="merge"
                  checked={mergeStrategy === 'merge'}
                  onChange={(e) =>
                    setMergeStrategy(e.target.value as MergeStrategy)
                  }
                  className="mt-0.5 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Merge with existing data
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    Add {newVisitsCount} new{' '}
                    {newVisitsCount === 1 ? 'visit' : 'visits'}
                    {duplicatesCount > 0 &&
                      ` (skip ${duplicatesCount} duplicate${duplicatesCount === 1 ? '' : 's'})`}
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${mergeStrategy === 'replace' ? 'border-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
              >
                <input
                  type="radio"
                  name="merge-strategy"
                  value="replace"
                  checked={mergeStrategy === 'replace'}
                  onChange={(e) =>
                    setMergeStrategy(e.target.value as MergeStrategy)
                  }
                  className="mt-0.5 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    Replace all data
                  </div>
                  <div className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                    ⚠️ This will delete your current {currentVisits}{' '}
                    {currentVisits === 1 ? 'visit' : 'visits'}
                  </div>
                </div>
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => handleOpenChange(false)}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              variant={mergeStrategy === 'replace' ? 'destructive' : 'default'}
              className="flex-1"
            >
              {mergeStrategy === 'replace' ? 'Replace Data' : 'Merge Data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
