'use client'

import { Button } from '@/components/ui/button'
import { trackEvent } from '@/lib/tracking'
import {
  Calendar,
  CalendarDays,
  BarChart3,
  Loader2,
  MessageSquareText,
  Plus,
  X,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'

type ExportType = 'calendar' | 'stats' | null

interface MobileFabProps {
  onAddClick: () => void
  onExportClick: () => Promise<void>
  onExportStatsClick: () => Promise<void>
  onExportMonthClick: () => void
  onFeedbackClick: () => void
  hasVisits: boolean
}

interface FabActionProps {
  label: string
  ariaLabel: string
  icon: ReactNode
  onClick: () => void
  disabled: boolean
}

function FabAction({
  label,
  ariaLabel,
  icon,
  onClick,
  disabled,
}: FabActionProps) {
  return (
    <div className="flex items-center gap-2 me-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <span className="rounded-full bg-gray-900 px-3 py-1.5 text-sm text-white shadow-lg dark:bg-zinc-100 dark:text-gray-900">
        {label}
      </span>
      <Button
        className="size-12 rounded-full border border-gray-200 bg-white text-gray-900 shadow-lg hover:bg-gray-50 dark:border-white/10 dark:bg-[#1a1a1a] dark:text-zinc-100 dark:hover:bg-[#222222]"
        size="icon"
        variant="secondary"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
      >
        {icon}
      </Button>
    </div>
  )
}

export default function MobileFab({
  onAddClick,
  onExportClick,
  onExportStatsClick,
  onExportMonthClick,
  onFeedbackClick,
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

  const handleScrimClick = () => {
    if (!isExporting) setIsExpanded(false)
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

  const handleExportMonthClick = () => {
    setIsExpanded(false)
    onExportMonthClick()
  }

  const handleFeedbackClick = () => {
    setIsExpanded(false)
    onFeedbackClick()
  }

  return (
    <>
      {showExpanded && (
        <div
          aria-hidden="true"
          data-testid="mobile-fab-scrim"
          onClick={handleScrimClick}
          className="lg:hidden fixed inset-0 z-30 bg-white/70 backdrop-blur-[2px] dark:bg-black/70 animate-in fade-in duration-200"
        />
      )}

      <div className="lg:hidden absolute bottom-6 right-3 flex flex-col items-end gap-3 z-40">
        {showExpanded && (
          <>
            <FabAction
              label="Send Feedback"
              ariaLabel="Send feedback"
              icon={<MessageSquareText className="size-5" />}
              onClick={handleFeedbackClick}
              disabled={isExporting}
            />

            {hasVisits && (
              <>
                <FabAction
                  label="Download Month"
                  ariaLabel="Download month image"
                  icon={<CalendarDays className="size-5" />}
                  onClick={handleExportMonthClick}
                  disabled={isExporting}
                />
                <FabAction
                  label={
                    exportingType === 'stats'
                      ? 'Generating...'
                      : 'Download Statistics'
                  }
                  ariaLabel="Download statistics image"
                  icon={
                    exportingType === 'stats' ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <BarChart3 className="size-5" />
                    )
                  }
                  onClick={handleExportStatsClick}
                  disabled={isExporting}
                />
                <FabAction
                  label={
                    exportingType === 'calendar'
                      ? 'Generating...'
                      : 'Download Calendar'
                  }
                  ariaLabel="Download calendar image"
                  icon={
                    exportingType === 'calendar' ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <Calendar className="size-5" />
                    )
                  }
                  onClick={handleExportClick}
                  disabled={isExporting}
                />
              </>
            )}

            <FabAction
              label="Add Visit"
              ariaLabel="Add visit"
              icon={<Plus className="size-5" />}
              onClick={handleAddClick}
              disabled={isExporting}
            />
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
          {showExpanded ? (
            <X className="size-6" />
          ) : (
            <Plus className="size-6" />
          )}
        </Button>
      </div>
    </>
  )
}
