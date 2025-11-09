import { useState, useRef } from 'react'
import type { CalendarData } from '../lib/types'
import { importFromJSON } from '../lib/storage'
import {
  calculateTotalCountriesVisited,
  calculateTotalVisits,
} from '../lib/statistics'

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
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
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
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)

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

      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
      setShowModal(false)
      setImportedData(null)
    } catch (error) {
      console.error('Import merge failed:', error)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)

      if (onError) {
        onError(
          error instanceof Error ? error : new Error('Import merge failed')
        )
      }
    }
  }

  const handleCancel = () => {
    setShowModal(false)
    setImportedData(null)
    setMergeStrategy('merge')
  }

  const buttonText =
    status === 'success'
      ? 'Imported!'
      : status === 'error'
        ? 'Import failed'
        : 'Import JSON'

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

      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={status !== 'idle'}
        className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
          status === 'success'
            ? 'bg-green-600 text-white'
            : status === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700'
        }`}
        aria-label="Import calendar data from JSON file"
      >
        {buttonText}
      </button>

      {showModal && importedData && (
        <ImportConfirmationModal
          importedData={importedData}
          currentData={currentData}
          mergeStrategy={mergeStrategy}
          onStrategyChange={setMergeStrategy}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </>
  )
}

interface ImportConfirmationModalProps {
  importedData: CalendarData
  currentData: CalendarData
  mergeStrategy: MergeStrategy
  onStrategyChange: (strategy: MergeStrategy) => void
  onConfirm: () => void
  onCancel: () => void
}

function ImportConfirmationModal({
  importedData,
  currentData,
  mergeStrategy,
  onStrategyChange,
  onConfirm,
  onCancel,
}: ImportConfirmationModalProps) {
  const importedVisits = calculateTotalVisits(importedData.visits)
  const importedCountries = calculateTotalCountriesVisited(importedData.visits)
  const currentVisits = calculateTotalVisits(currentData.visits)
  const currentCountries = calculateTotalCountriesVisited(currentData.visits)

  const existingIds = new Set(currentData.visits.map((v) => v.id))
  const newVisitsCount = importedData.visits.filter(
    (visit) => !existingIds.has(visit.id)
  ).length
  const duplicatesCount = importedData.visits.length - newVisitsCount

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
      onClick={onCancel}
      role="dialog"
      aria-labelledby="import-modal-title"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-zinc-900 rounded-lg shadow-xl max-w-md w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="import-modal-title"
          className="text-xl font-semibold text-gray-900 dark:text-white"
        >
          Import Calendar Data
        </h2>

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
            <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
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

            <label className="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-900 ${mergeStrategy === 'merge' ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-800'}">
              <input
                type="radio"
                name="merge-strategy"
                value="merge"
                checked={mergeStrategy === 'merge'}
                onChange={(e) =>
                  onStrategyChange(e.target.value as MergeStrategy)
                }
                className="mt-0.5"
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

            <label className="flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-900 ${mergeStrategy === 'replace' ? 'border-red-600 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-800'}">
              <input
                type="radio"
                name="merge-strategy"
                value="replace"
                checked={mergeStrategy === 'replace'}
                onChange={(e) =>
                  onStrategyChange(e.target.value as MergeStrategy)
                }
                className="mt-0.5"
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

        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg font-medium border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 rounded-lg font-medium text-white transition-colors ${
              mergeStrategy === 'replace'
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {mergeStrategy === 'replace' ? 'Replace Data' : 'Merge Data'}
          </button>
        </div>
      </div>
    </div>
  )
}
