'use client'

import { Button } from '@/components/ui/button'
import { trackEvent } from '@/lib/tracking'
import { Calendar, BarChart3, Loader2, Plus, X } from 'lucide-react'
import { useState } from 'react'

type ExportType = 'calendar' | 'stats' | null

interface MobileFabProps {
  onAddClick: () => void
  onExportClick: () => Promise<void>
  onExportStatsClick: () => Promise<void>
  hasVisits: boolean
}

export default function MobileFab({
  onAddClick,
  onExportClick,
  onExportStatsClick,
  hasVisits,
}: MobileFabProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [exportingType, setExportingType] = useState<ExportType>(null)

  const isExporting = exportingType !== null
  const showExpanded = isExpanded || isExporting

  const handleToggle = () => {
    if (isExporting) return
    setIsExpanded((prev) => !prev)
    if (!isExpanded) {
      trackEvent('mobile_fab_click')
    }
  }

  const handleAddClick = () => {
    setIsExpanded(false)
    onAddClick()
  }

  const handleExportClick = async () => {
    setExportingType('calendar')
    try {
      await onExportClick()
    } finally {
      setExportingType(null)
      setIsExpanded(false)
    }
  }

  const handleExportStatsClick = async () => {
    setExportingType('stats')
    try {
      await onExportStatsClick()
    } finally {
      setExportingType(null)
      setIsExpanded(false)
    }
  }

  return (
    <div className="lg:hidden absolute bottom-6 right-3 flex flex-col items-end gap-3 z-40">
      {showExpanded && (
        <>
          {hasVisits && (
            <>
              <div className="flex items-center gap-2 me-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <span className="bg-gray-900 text-white text-sm px-3 py-1.5 rounded-full shadow-lg">
                  {exportingType === 'stats'
                    ? 'Generating...'
                    : 'Download Statistics'}
                </span>
                <Button
                  className="size-12 rounded-full shadow-lg"
                  size="icon"
                  variant="secondary"
                  onClick={handleExportStatsClick}
                  disabled={isExporting}
                  aria-label="Download statistics image"
                >
                  {exportingType === 'stats' ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <BarChart3 className="size-5" />
                  )}
                </Button>
              </div>

              <div className="flex items-center gap-2 me-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <span className="bg-gray-900 text-white text-sm px-3 py-1.5 rounded-full shadow-lg">
                  {exportingType === 'calendar'
                    ? 'Generating...'
                    : 'Download Calendar'}
                </span>
                <Button
                  className="size-12 rounded-full shadow-lg"
                  size="icon"
                  variant="secondary"
                  onClick={handleExportClick}
                  disabled={isExporting}
                  aria-label="Download calendar image"
                >
                  {exportingType === 'calendar' ? (
                    <Loader2 className="size-5 animate-spin" />
                  ) : (
                    <Calendar className="size-5" />
                  )}
                </Button>
              </div>
            </>
          )}

          <div className="flex items-center gap-2 me-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <span className="bg-gray-900 text-white text-sm px-3 py-1.5 rounded-full shadow-lg">
              Add Visit
            </span>
            <Button
              className="size-12 rounded-full shadow-lg"
              size="icon"
              variant="secondary"
              disabled={isExporting}
              onClick={handleAddClick}
              aria-label="Add visit"
            >
              <Plus className="size-5" />
            </Button>
          </div>
        </>
      )}

      <Button
        className="size-14 rounded-full shadow transition-transform duration-200"
        size="icon"
        onClick={handleToggle}
        disabled={isExporting}
        aria-label={showExpanded ? 'Close menu' : 'Open menu'}
        aria-expanded={showExpanded}
      >
        {showExpanded ? <X className="size-6" /> : <Plus className="size-6" />}
      </Button>
    </div>
  )
}
