'use client'

import BadgesCard from '@/components/badges/BadgesCard'
import BadgeUnlockedDialog from '@/components/badges/BadgeUnlockedDialog'
import CalendarGrid from '@/components/CalendarGrid'
import CalendarHint from '@/components/CalendarHint'
import CountryInput from '@/components/CountryInput'
import DaySelectionPanel, {
  type AddFromSelectionMeta,
  type ReorderMethod,
} from '@/components/DaySelectionPanel'
import DeveloperMode from '@/components/DeveloperMode'
import FeedbackButton from '@/components/FeedbackButton'
import FeedbackCard from '@/components/FeedbackCard'
import FeedbackDialog from '@/components/FeedbackDialog'
import Header from '@/components/Header'
import CalendarExportButton from '@/components/CalendarExportButton'
import ImagePreviewModal from '@/components/ImagePreviewModal'
import MobileFab from '@/components/MobileFab'
import Settings from '@/components/Settings'
import Statistics from '@/components/Statistics'
import TravelNudgeCard from '@/components/TravelNudgeCard'
import TripCountdown from '@/components/TripCountdown'
import StatisticsExportButton from '@/components/StatisticsExportButton'
import MapExportButton from '@/components/map/MapExportButton'
import WorldMapCard from '@/components/map/WorldMapCard'
import UndoToast from '@/components/UndoToast'
import WrappedButton from '@/components/wrapped/WrappedButton'
import YearCompareDialog from '@/components/YearCompareDialog'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DarkCard, StandardCard } from '@/components/ui/card-variants'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getTrafficSource } from '@/lib/attribution/traffic-source'
import { getCountryByCode } from '@/lib/countries'
import type { FeedbackSource } from '@/lib/feedback/types'
import { MONTH_NAMES, MONTH_NAMES_SHORT } from '@/lib/constants'
import {
  dismissCalendarHint,
  useCalendarHintDismissed,
} from '@/lib/hooks/useCalendarHint'
import { useImageExport } from '@/lib/hooks/useImageExport'
import { useMonthlyExport } from '@/lib/hooks/useMonthlyExport'
import { useStatisticsExport } from '@/lib/hooks/useStatisticsExport'
import { computeBadges, newlyEarned, type Badge } from '@/lib/badges'
import { toDayKey, type DaySelection } from '@/lib/selection'
import { buildDayMap } from '@/lib/trips'
import { countriesInScope } from '@/lib/world-map'
import { loadCalendarData, saveCalendarData } from '@/lib/storage'
import { trackEvent } from '@/lib/tracking'
import type { CalendarData } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  addCountryToDays,
  removeCountryFromDays,
  reorderCountriesOnDays,
} from '@/lib/visits'
import { CalendarDays, Loader2, Undo2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

function getInitialData(): CalendarData {
  if (typeof window === 'undefined') {
    return { visits: [] }
  }
  return loadCalendarData() || { visits: [] }
}

function pluralDays(count: number) {
  return `${count} ${count === 1 ? 'day' : 'days'}`
}

function Create() {
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  )
  const [calendarData, setCalendarData] = useState<CalendarData>(getInitialData)
  const [undoStack, setUndoStack] = useState<CalendarData[]>([])
  const [isMobileAddDialogOpen, setIsMobileAddDialogOpen] = useState(false)
  const [selection, setSelection] = useState<DaySelection | null>(null)
  const [toast, setToast] = useState<{
    id: number
    message: string
    undoable: boolean
  } | null>(null)
  const toastIdRef = useRef(0)
  const selectionPanelRef = useRef<HTMLDivElement>(null)
  const hintDismissed = useCalendarHintDismissed()
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  )
  const [isMobileMonthDialogOpen, setIsMobileMonthDialogOpen] = useState(false)
  const [feedbackDialog, setFeedbackDialog] = useState<{
    open: boolean
    source: FeedbackSource
  }>({ open: false, source: 'feedback_button' })

  const openFeedbackDialog = (source: FeedbackSource) => {
    trackEvent('feedback_dialog_open', { source })
    setFeedbackDialog({ open: true, source })
  }

  const {
    exportImage,
    status: mobileExportStatus,
    previewOpen: mobilePreviewOpen,
    setPreviewOpen: setMobilePreviewOpen,
    imageDataUrl: mobileImageDataUrl,
    filename: mobileFilename,
    format: mobileFormat,
    changeFormat: changeMobileFormat,
  } = useImageExport({ calendarData, year: selectedYear })

  const {
    exportStatistics,
    status: statsExportStatus,
    previewOpen: statsPreviewOpen,
    setPreviewOpen: setStatsPreviewOpen,
    imageDataUrl: statsImageDataUrl,
    filename: statsFilename,
    format: statsFormat,
    changeFormat: changeStatsFormat,
  } = useStatisticsExport({ calendarData, year: selectedYear })

  const {
    exportMonth,
    status: monthlyExportStatus,
    previewOpen: monthlyPreviewOpen,
    setPreviewOpen: setMonthlyPreviewOpen,
    imageDataUrl: monthlyImageDataUrl,
    filename: monthlyFilename,
    format: monthlyFormat,
    changeFormat: changeMonthlyFormat,
  } = useMonthlyExport({
    calendarData,
    year: selectedYear,
    month: selectedMonth,
  })

  useEffect(() => {
    trackEvent('create_page_view', getTrafficSource())
  }, [])

  const todayKey = toDayKey(new Date())
  const badges = useMemo(
    () => computeBadges(buildDayMap(calendarData.visits), todayKey),
    [calendarData.visits, todayKey]
  )
  const [unlockedBadges, setUnlockedBadges] = useState<Badge[]>([])
  const yearCountries = useMemo(
    () => countriesInScope(buildDayMap(calendarData.visits), selectedYear),
    [calendarData.visits, selectedYear]
  )

  const handleDataChange = useCallback(
    (newData: CalendarData) => {
      const unlocked = newlyEarned(
        badges,
        computeBadges(buildDayMap(newData.visits), todayKey)
      )
      if (unlocked.length > 0) {
        setUnlockedBadges(unlocked)
        trackEvent('badge_unlocked', {
          badgeIds: unlocked.map((badge) => badge.id),
        })
      }
      setUndoStack((prev) => [...prev.slice(-9), calendarData])
      setCalendarData(newData)
      saveCalendarData(newData)
    },
    [calendarData, badges, todayKey]
  )

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return

    const previousData = undoStack[undoStack.length - 1]
    setUndoStack((prev) => prev.slice(0, -1))
    setCalendarData(previousData)
    saveCalendarData(previousData)
    setToast(null)

    trackEvent('visit_undo')
  }, [undoStack])

  const showToast = (message: string, undoable = true) => {
    toastIdRef.current += 1
    setToast({ id: toastIdRef.current, message, undoable })
  }

  const dismissToast = useCallback(() => setToast(null), [])

  const clearSelection = useCallback(() => setSelection(null), [])

  const handleAddFromSelection = (
    countryCode: string,
    days: Date[],
    meta: AddFromSelectionMeta
  ) => {
    const result = addCountryToDays(calendarData.visits, countryCode, days)
    const name = getCountryByCode(countryCode)?.name ?? countryCode

    trackEvent('visit_add_attempt', {
      success: result.added > 0,
      source: 'calendar',
      selectionMethod: selection?.method,
      suggested: meta.suggested,
      emptyOnly: meta.emptyOnly,
      countryCode,
      dateCount: result.added,
      skippedFull: result.skippedFull,
      skippedExisting: result.skippedExisting,
    })

    if (result.added === 0) {
      showToast(`${name} is already on the selected days`, false)
      return
    }

    handleDataChange({ visits: result.visits })
    setSelection(null)
    dismissCalendarHint()
    showToast(
      result.skippedFull > 0
        ? `Added ${name} to ${pluralDays(result.added)} (${result.skippedFull} already full)`
        : `Added ${name} to ${pluralDays(result.added)}`
    )
  }

  const handleRemoveFromSelection = (days: Date[], countryCode?: string) => {
    const result = removeCountryFromDays(calendarData.visits, days, countryCode)
    if (result.removed === 0) return

    handleDataChange({ visits: result.visits })
    trackEvent('visit_deleted', {
      source: 'calendar',
      countryCode,
      countryName: countryCode
        ? getCountryByCode(countryCode)?.name
        : undefined,
      dateCount: result.removed,
    })
    showToast(
      countryCode
        ? `Removed ${getCountryByCode(countryCode)?.name ?? countryCode} from ${pluralDays(result.removed)}`
        : 'Cleared the selected days'
    )
  }

  const handleReorderOnSelection = (
    days: Date[],
    order: string[],
    method: ReorderMethod
  ) => {
    handleDataChange({
      visits: reorderCountriesOnDays(calendarData.visits, days, order),
    })
    trackEvent('visit_reordered', { source: 'calendar', method, order })
    showToast(`${getCountryByCode(order[0])?.name ?? order[0]} now shows first`)
  }

  useEffect(() => {
    if (!selection || selection.method !== 'tap') return
    const cell = document.querySelector(`[data-day="${selection.focus}"]`)
    const panel = selectionPanelRef.current
    if (!cell || !panel) return
    const visibleBottom = window.innerHeight - panel.offsetHeight - 12
    const overlap = cell.getBoundingClientRect().bottom - visibleBottom
    if (overlap > 0) {
      window.scrollBy({ top: overlap, behavior: 'smooth' })
    }
  }, [selection])

  const handleYearChange = (value: string) => {
    const newYear = Number(value)
    trackEvent('year_changed', {
      fromYear: selectedYear,
      toYear: newYear,
    })
    setSelectedYear(newYear)
    setSelection(null)
  }

  const handleResetCalendar = useCallback(() => {
    const newData = {
      visits: calendarData.visits.filter((visit) => {
        const visitYear = new Date(visit.date).getFullYear()
        return visitYear !== selectedYear
      }),
    }
    setUndoStack((prev) => [...prev.slice(-9), calendarData])
    setCalendarData(newData)
    saveCalendarData(newData)
  }, [calendarData, selectedYear])

  const pendingMonthExport = useRef<{ month: number; source: 'header' } | null>(
    null
  )

  const handleMonthExport = useCallback(
    (month: number) => {
      if (month === selectedMonth) {
        exportMonth('header')
      } else {
        setSelectedMonth(month)
        pendingMonthExport.current = { month, source: 'header' }
      }
    },
    [selectedMonth, exportMonth]
  )

  useEffect(() => {
    if (
      pendingMonthExport.current &&
      pendingMonthExport.current.month === selectedMonth
    ) {
      const { source } = pendingMonthExport.current
      pendingMonthExport.current = null
      exportMonth(source)
    }
  }, [selectedMonth, exportMonth])

  const visitsForSelectedYear = calendarData.visits.filter((visit) => {
    const visitYear = new Date(visit.date).getFullYear()
    return visitYear === selectedYear
  }).length

  return (
    <>
      <Header>
        <Select
          value={selectedYear.toString()}
          onValueChange={handleYearChange}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={(new Date().getFullYear() - 1).toString()}>
              {new Date().getFullYear() - 1}
            </SelectItem>
            <SelectItem value={new Date().getFullYear().toString()}>
              {new Date().getFullYear()}
            </SelectItem>
            <SelectItem value={(new Date().getFullYear() + 1).toString()}>
              {new Date().getFullYear() + 1}
            </SelectItem>
          </SelectContent>
        </Select>
      </Header>

      <div>
        <main className="container mx-auto px-3 py-6">
          <h1 className="sr-only">Make your travel calendar</h1>
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 mb-16">
            <div className="min-w-0 space-y-4">
              <TripCountdown calendarData={calendarData} />
              <StandardCard>
                <CardContent>
                  {!hintDismissed && (
                    <CalendarHint onDismiss={dismissCalendarHint} />
                  )}
                  <CalendarGrid
                    year={selectedYear}
                    calendarData={calendarData}
                    selection={selection}
                    onSelectionChange={setSelection}
                    onMonthExport={handleMonthExport}
                  />
                </CardContent>
              </StandardCard>
              <WorldMapCard calendarData={calendarData} year={selectedYear} />
            </div>

            <aside className="space-y-4">
              <StandardCard>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium flex items-center gap-2 text-gray-900 dark:text-zinc-100">
                      <span className="text-2xl">✈️</span>
                      Add Visit
                    </CardTitle>
                    {undoStack.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleUndo}
                        className="text-gray-500 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300"
                      >
                        <Undo2 className="size-4 mr-1" />
                        Undo
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <CountryInput
                    year={selectedYear}
                    calendarData={calendarData}
                    onDataChange={handleDataChange}
                  />
                </CardContent>
              </StandardCard>

              <TravelNudgeCard
                calendarData={calendarData}
                onPlanTrip={() => setIsMobileAddDialogOpen(true)}
              />

              {visitsForSelectedYear > 0 && (
                <DarkCard>
                  <CardHeader>
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                      <span className="text-2xl">📸</span>
                      Export
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-gray-300 dark:text-zinc-400 leading-relaxed">
                        Download high-quality images to share
                      </p>
                      <WrappedButton
                        calendarData={calendarData}
                        year={selectedYear}
                        badges={badges}
                        onDownloadCalendar={exportImage}
                      />
                      <CalendarExportButton
                        calendarData={calendarData}
                        year={selectedYear}
                      />
                      <StatisticsExportButton
                        calendarData={calendarData}
                        year={selectedYear}
                      />
                      <MapExportButton
                        calendarData={calendarData}
                        countries={yearCountries}
                        year={selectedYear}
                        mode="flags"
                      />
                      <div className="border-t border-white/20 dark:border-white/8 pt-3">
                        <div className="flex items-center gap-2">
                          <Select
                            value={selectedMonth.toString()}
                            onValueChange={(v) => setSelectedMonth(Number(v))}
                          >
                            <SelectTrigger className="flex-1 h-10! min-w-0 bg-white text-gray-900 text-sm! font-medium dark:text-white dark:bg-black dark:border-transparent hover:bg-gray-100 dark:hover:bg-gray-800">
                              <SelectValue>
                                {MONTH_NAMES_SHORT[selectedMonth]}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {MONTH_NAMES.map((name, i) => (
                                <SelectItem key={i} value={i.toString()}>
                                  {name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={() => exportMonth()}
                            disabled={monthlyExportStatus === 'loading'}
                            variant="cta"
                            size="lg"
                            className="whitespace-nowrap w-[180px]"
                          >
                            {monthlyExportStatus === 'loading' ? (
                              <>
                                <Loader2 className="size-5 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <CalendarDays className="size-5" />
                                Download Month
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </DarkCard>
              )}

              <StandardCard>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium flex items-center gap-2 text-gray-900 dark:text-zinc-100">
                      <span className="text-2xl">📊</span>
                      Statistics
                    </CardTitle>
                    <YearCompareDialog
                      calendarData={calendarData}
                      year={selectedYear}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <Statistics calendarData={calendarData} year={selectedYear} />
                </CardContent>
              </StandardCard>

              <BadgesCard badges={badges} />

              {calendarData.visits.length > 0 && (
                <FeedbackCard year={selectedYear} />
              )}

              <StandardCard>
                <CardHeader>
                  <CardTitle className="text-lg font-medium flex items-center gap-2 text-gray-900 dark:text-zinc-100">
                    <span className="text-2xl">⚙️</span>
                    Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Settings
                    year={selectedYear}
                    visitCount={visitsForSelectedYear}
                    onReset={handleResetCalendar}
                  />
                </CardContent>
              </StandardCard>
            </aside>
          </div>

          <StandardCard className="p-0 overflow-hidden">
            <details
              onToggle={(e) => {
                const isOpen = (e.target as HTMLDetailsElement).open
                trackEvent('developer_mode_toggle', { opened: isOpen })
              }}
            >
              <summary className="px-6 py-4 cursor-pointer text-gray-900 dark:text-zinc-100 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/4 transition-colors rounded-lg list-none flex items-center gap-2">
                <span className="text-lg">🔧</span>
                Developer Mode
              </summary>
              <div className="px-6 pb-4 pt-2">
                <DeveloperMode
                  calendarData={calendarData}
                  year={selectedYear}
                  onDataChange={handleDataChange}
                />
              </div>
            </details>
          </StandardCard>
          {selection && <div aria-hidden="true" className="h-72" />}
        </main>

        <div className="sticky bottom-0 right-0">
          {!selection && (
            <MobileFab
              onAddClick={() => setIsMobileAddDialogOpen(true)}
              onExportClick={exportImage}
              onExportStatsClick={exportStatistics}
              onExportMonthClick={() => setIsMobileMonthDialogOpen(true)}
              onFeedbackClick={() => openFeedbackDialog('mobile_fab')}
              hasVisits={visitsForSelectedYear > 0}
            />
          )}
          <FeedbackButton
            onClick={() => openFeedbackDialog('feedback_button')}
            className="hidden lg:flex absolute bottom-6 right-6 z-40"
          />
        </div>
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center gap-2 sm:bottom-4 sm:px-4">
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18 }}
              className={cn(
                'flex w-full justify-center px-3 sm:px-0',
                !selection && 'pe-20 pb-6 sm:pe-0 sm:pb-0'
              )}
            >
              <UndoToast
                message={toast.message}
                onUndo={toast.undoable ? handleUndo : undefined}
                onDismiss={dismissToast}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {selection && (
            <motion.div
              ref={selectionPanelRef}
              key="selection-panel"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="flex w-full justify-center"
            >
              <DaySelectionPanel
                key={`${selection.anchor}:${selection.focus}`}
                selection={selection}
                visits={calendarData.visits}
                year={selectedYear}
                onAdd={handleAddFromSelection}
                onRemove={handleRemoveFromSelection}
                onReorder={handleReorderOnSelection}
                onClose={clearSelection}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <Dialog
        open={isMobileAddDialogOpen}
        onOpenChange={setIsMobileAddDialogOpen}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">✈️</span>
              Add Visit
            </DialogTitle>
          </DialogHeader>
          <CountryInput
            year={selectedYear}
            calendarData={calendarData}
            onDataChange={(data) => {
              handleDataChange(data)
              setIsMobileAddDialogOpen(false)
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={isMobileMonthDialogOpen}
        onOpenChange={setIsMobileMonthDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">📅</span>
              Download Month
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={selectedMonth.toString()}
              onValueChange={(v) => setSelectedMonth(Number(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                setIsMobileMonthDialogOpen(false)
                requestAnimationFrame(() => exportMonth('mobile_fab'))
              }}
              disabled={monthlyExportStatus === 'loading'}
              variant="cta"
              size="lg"
              className="w-full"
            >
              {monthlyExportStatus === 'loading' ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <CalendarDays className="size-5" />
                  Download Month
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <BadgeUnlockedDialog
        badges={unlockedBadges}
        onClose={() => setUnlockedBadges([])}
      />

      <FeedbackDialog
        open={feedbackDialog.open}
        onOpenChange={(open) =>
          setFeedbackDialog((current) => ({ ...current, open }))
        }
        source={feedbackDialog.source}
      />

      <ImagePreviewModal
        open={mobilePreviewOpen}
        onOpenChange={setMobilePreviewOpen}
        imageDataUrl={mobileImageDataUrl}
        filename={mobileFilename}
        year={selectedYear}
        calendarData={calendarData}
        exportType="calendar"
        format={mobileFormat}
        onFormatChange={changeMobileFormat}
        isRendering={mobileExportStatus === 'loading'}
      />

      <ImagePreviewModal
        open={statsPreviewOpen}
        onOpenChange={setStatsPreviewOpen}
        imageDataUrl={statsImageDataUrl}
        filename={statsFilename}
        year={selectedYear}
        calendarData={calendarData}
        exportType="statistics"
        format={statsFormat}
        onFormatChange={changeStatsFormat}
        isRendering={statsExportStatus === 'loading'}
      />

      <ImagePreviewModal
        open={monthlyPreviewOpen}
        onOpenChange={setMonthlyPreviewOpen}
        imageDataUrl={monthlyImageDataUrl}
        filename={monthlyFilename}
        year={selectedYear}
        month={selectedMonth}
        calendarData={calendarData}
        exportType="monthly"
        format={monthlyFormat}
        onFormatChange={changeMonthlyFormat}
        isRendering={monthlyExportStatus === 'loading'}
      />
    </>
  )
}

export default Create
