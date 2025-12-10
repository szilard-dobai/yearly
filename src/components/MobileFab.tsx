'use client'

import { Button } from '@/components/ui/button'
import { trackEvent } from '@/lib/tracking'
import { Image as ImageIcon, Loader2, Plus, X } from 'lucide-react'
import { useState } from 'react'

interface MobileFabProps {
  onAddClick: () => void
  onExportClick: () => Promise<void>
  hasVisits: boolean
}

export default function MobileFab({
  onAddClick,
  onExportClick,
  hasVisits,
}: MobileFabProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

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
    setIsExporting(true)
    try {
      await onExportClick()
    } finally {
      setIsExporting(false)
      setIsExpanded(false)
    }
  }

  return (
    <div className="lg:hidden absolute bottom-6 right-3 flex flex-col items-end gap-3 z-40">
      {showExpanded && (
        <>
          {hasVisits && (
            <div className="flex items-center gap-2 me-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <span className="bg-gray-900 text-white text-sm px-3 py-1.5 rounded-full shadow-lg">
                {isExporting ? 'Exporting...' : 'Export'}
              </span>
              <Button
                className="size-12 rounded-full shadow-lg"
                size="icon"
                variant="secondary"
                onClick={handleExportClick}
                disabled={isExporting}
                aria-label="Export calendar"
              >
                {isExporting ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <ImageIcon className="size-5" />
                )}
              </Button>
            </div>
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
