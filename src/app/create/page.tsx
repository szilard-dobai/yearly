'use client'

import { Emoji } from '@/components/Emoji'
import AccountPrompt from '@/components/account/AccountPrompt'
import AccountSyncStatus from '@/components/account/AccountSyncStatus'
import FirstSyncDialog from '@/components/account/FirstSyncDialog'
import BadgesCard from '@/components/badges/BadgesCard'
import BadgesTeaser from '@/components/badges/BadgesTeaser'
import BadgeUnlockedDialog from '@/components/badges/BadgeUnlockedDialog'
import CalendarGrid from '@/components/CalendarGrid'
import CalendarHint from '@/components/CalendarHint'
import CountryInput from '@/components/CountryInput'
import DaySelectionPanel, {
  type AddFromSelectionMeta,
  type ReorderMethod,
} from '@/components/DaySelectionPanel'
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
import MapExportButton from '@/components/map/MapExportButton'
import MapTeaser from '@/components/map/MapTeaser'
import WorldMapCard from '@/components/map/WorldMapCard'
import StatisticsExportButton from '@/components/StatisticsExportButton'
import UndoToast from '@/components/UndoToast'
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
import { useVideoSales } from '@/components/video/VideoSalesProvider'
import { getTrafficSource } from '@/lib/attribution/traffic-source'
import {
  computeBadges,
  earnedBadges,
  newlyEarned,
  type Badge,
} from '@/lib/badges'
import { CalendarAccountContext } from '@/lib/calendar-sync/CalendarAccountContext'
import { useCalendarSync } from '@/lib/calendar-sync/useCalendarSync'
import {
  ACCOUNT_PROMPT_MIN_DAYS,
  useAccountPromptDismissed,
} from '@/lib/hooks/useAccountPrompt'
import { getCountryByCode } from '@/lib/countries'
import type { ExportType, FeedbackSource } from '@/lib/feedback/types'
import { MONTH_NAMES, MONTH_NAMES_SHORT } from '@/lib/constants'
import {
  dismissCalendarHint,
  useCalendarHintDismissed,
} from '@/lib/hooks/useCalendarHint'
import { useImageExport } from '@/lib/hooks/useImageExport'
import { useMonthlyExport } from '@/lib/hooks/useMonthlyExport'
import { useStatisticsExport } from '@/lib/hooks/useStatisticsExport'
import { useTodayKey } from '@/lib/hooks/useTodayKey'
import { type DaySelection, toDayKey } from '@/lib/selection'
import { loadCalendarData, saveCalendarData } from '@/lib/storage'
import { trackEvent } from '@/lib/tracking'
import { buildDayMap } from '@/lib/trips'
import type { CalendarData } from '@/lib/types'
import { cn } from '@/lib/utils'
import type { VideoKind, VideoTheme } from '@/lib/video'
import { VIDEO_PACK_PRICE } from '@/lib/video-offer'
import {
  readVideoReturn,
  removeVideoReturnParams,
} from '@/lib/videos/checkout-return'
import { fetchVideoOrder } from '@/lib/videos/client'
import {
  addCountryToDays,
  removeCountryFromDays,
  reorderCountriesOnDays,
} from '@/lib/visits'
import { CalendarDays, Loader2, Undo2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const AnimatedVideoDialog = dynamic(
  () => import('@/components/AnimatedVideoDialog'),
  { ssr: false }
)

interface VideoReturnDialog {
  year: number
  month?: number
  exportType: ExportType
  kind?: VideoKind
  theme?: VideoTheme
  orderId?: string
}

const EXPORT_TYPE_FOR_KIND: Record<VideoKind, ExportType> = {
  year: 'calendar',
  stats: 'statistics',
  month: 'monthly',
}

function getInitialData(): CalendarData {
  if (typeof window === 'undefined') {
    return { visits: [] }
  }
  return loadCalendarData() || { visits: [] }
}

const YEAR_OFFSETS = [-1, 0, 1, 2, 3]

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

  const videoSalesEnabled = useVideoSales().enabled
  const [videoReturn, setVideoReturn] = useState<VideoReturnDialog | null>(null)
  const [videoReturnOpen, setVideoReturnOpen] = useState(false)

  useEffect(() => {
    const found = readVideoReturn(window.location.search)
    const strip = setTimeout(() => removeVideoReturnParams(), 0)
    if (!found || !videoSalesEnabled) return () => clearTimeout(strip)

    let cancelled = false
    const show = (dialog: VideoReturnDialog) => {
      if (cancelled) return
      setVideoReturn(dialog)
      setVideoReturnOpen(true)
    }
    if (found.type === 'resume') {
      const { kind, theme, year, month } = found.resume
      show({ kind, theme, year, month, exportType: EXPORT_TYPE_FOR_KIND[kind] })
    } else if (found.type === 'offer') {
      fetchVideoOrder(found.orderId)
        .then((order) => {
          trackEvent('animated_video_checkout_back', {
            pack: order.pack,
            year: order.year,
            ...(order.month !== null && { month: order.month }),
          })
          show({
            year: order.year,
            month: order.month ?? undefined,
            exportType: order.pack === 'month' ? 'monthly' : 'calendar',
          })
        })
        .catch(() => {})
    } else {
      const { orderId } = found
      fetchVideoOrder(orderId)
        .then((order) =>
          show({
            orderId,
            year: order.year,
            month: order.month ?? undefined,
            exportType: order.pack === 'month' ? 'monthly' : 'calendar',
          })
        )
        .catch(() =>
          show({
            orderId,
            year: new Date().getFullYear(),
            exportType: 'calendar',
          })
        )
    }
    return () => {
      cancelled = true
      clearTimeout(strip)
    }
  }, [videoSalesEnabled])

  const handleRemoteChange = useCallback((newData: CalendarData) => {
    setUndoStack([])
    setCalendarData(newData)
    saveCalendarData(newData)
  }, [])

  const accountPromptDismissed = useAccountPromptDismissed()
  const [accountPromptDone, setAccountPromptDone] = useState(false)
  const accountPromptSeenRef = useRef(false)
  const calendarSync = useCalendarSync({
    calendarData,
    onRemoteChange: handleRemoteChange,
  })

  const todayKey = useTodayKey()
  const signedIn = calendarSync.account !== null
  const badges = useMemo(
    () =>
      calendarSync.sessionChecked && todayKey
        ? computeBadges(buildDayMap(calendarData.visits), todayKey)
        : null,
    [calendarSync.sessionChecked, calendarData.visits, todayKey]
  )
  const [unlockedBadges, setUnlockedBadges] = useState<Badge[]>([])
  const mapDayMap = useMemo(
    () => (signedIn ? buildDayMap(calendarData.visits) : null),
    [signedIn, calendarData.visits]
  )
  const allTimeCountryCount = useMemo(
    () => new Set(calendarData.visits.map((v) => v.countryCode)).size,
    [calendarData.visits]
  )
  const [unlockedOpen, setUnlockedOpen] = useState(false)

  const handleDataChange = useCallback(
    (newData: CalendarData) => {
      if (signedIn && badges && todayKey) {
        const unlocked = newlyEarned(
          badges,
          computeBadges(buildDayMap(newData.visits), todayKey)
        )
        if (unlocked.length > 0) {
          setUnlockedBadges(unlocked)
          setUnlockedOpen(true)
          trackEvent('badge_unlocked', {
            badgeIds: unlocked.map((badge) => badge.id),
          })
        }
      }
      setUndoStack((prev) => [...prev.slice(-9), calendarData])
      setCalendarData(newData)
      saveCalendarData(newData)
    },
    [calendarData, signedIn, badges, todayKey]
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

  const daysWithTrips = new Set(
    calendarData.visits.map((visit) => toDayKey(visit.date))
  ).size
  const showAccountPrompt =
    calendarSync.sessionChecked &&
    !calendarSync.account &&
    !accountPromptDismissed &&
    daysWithTrips >= ACCOUNT_PROMPT_MIN_DAYS
  const showAccountToast =
    showAccountPrompt && !accountPromptDone && !toast && !selection

  const handleSelectionChange = (next: DaySelection | null) => {
    if (next && accountPromptSeenRef.current) setAccountPromptDone(true)
    setSelection(next)
  }

  return (
    <CalendarAccountContext value={calendarSync}>
      <Header>
        <Select
          value={selectedYear.toString()}
          onValueChange={handleYearChange}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {YEAR_OFFSETS.map((offset) => {
              const year = new Date().getFullYear() + offset
              return (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </Header>

      <FirstSyncDialog request={calendarSync.firstSyncRequest} />

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
                    onSelectionChange={handleSelectionChange}
                    onMonthExport={handleMonthExport}
                  />
                </CardContent>
              </StandardCard>
              {calendarSync.sessionChecked &&
                calendarData.visits.length > 0 &&
                (signedIn ? (
                  <WorldMapCard
                    calendarData={calendarData}
                    year={selectedYear}
                  />
                ) : (
                  <MapTeaser countryCount={allTimeCountryCount} />
                ))}
            </div>

            <aside className="space-y-4">
              <StandardCard>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-medium flex items-center gap-2 text-gray-900 dark:text-zinc-100">
                      <span className="text-2xl">
                        <Emoji name="airplane" />
                      </span>
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

              {visitsForSelectedYear > 0 && (
                <DarkCard>
                  <CardHeader>
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                      <span className="text-2xl">
                        <Emoji name="cameraWithFlash" />
                      </span>
                      Export
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-gray-300 dark:text-zinc-400 leading-relaxed">
                        Download high-quality images to share
                      </p>
                      <CalendarExportButton
                        calendarData={calendarData}
                        year={selectedYear}
                      />
                      <StatisticsExportButton
                        calendarData={calendarData}
                        year={selectedYear}
                      />
                      {mapDayMap && (
                        <MapExportButton
                          calendarData={calendarData}
                          previewYear={selectedYear}
                          source="export_card"
                          dayMap={mapDayMap}
                          year={selectedYear}
                          mode="flags"
                          continent={null}
                        />
                      )}
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

              <TravelNudgeCard
                calendarData={calendarData}
                onPlanTrip={() => setIsMobileAddDialogOpen(true)}
              />

              <StandardCard>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg font-medium flex items-center gap-2 text-gray-900 dark:text-zinc-100">
                      <span className="text-2xl">
                        <Emoji name="barChart" />
                      </span>
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

              {badges &&
                (signedIn ? (
                  <BadgesCard badges={badges} />
                ) : (
                  <BadgesTeaser
                    earned={earnedBadges(badges).length}
                    total={badges.length}
                  />
                ))}

              {calendarData.visits.length > 0 && (
                <FeedbackCard year={selectedYear} />
              )}

              <StandardCard>
                <CardHeader>
                  <CardTitle className="text-lg font-medium flex items-center gap-2 text-gray-900 dark:text-zinc-100">
                    <span className="text-2xl">
                      <Emoji name="gear" />
                    </span>
                    Settings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {calendarSync.account && (
                    <div className="mb-4 border-b border-gray-200 pb-4 dark:border-white/8">
                      <AccountSyncStatus
                        status={calendarSync.status}
                        email={calendarSync.account.email}
                      />
                    </div>
                  )}
                  <Settings
                    year={selectedYear}
                    visitCount={visitsForSelectedYear}
                    onReset={handleResetCalendar}
                  />
                </CardContent>
              </StandardCard>
            </aside>
          </div>

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
          {showAccountToast && (
            <motion.div
              key="account-prompt"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.18 }}
              className="flex w-full justify-center px-3 pb-24 sm:px-0 lg:pb-0"
            >
              <AccountPrompt
                days={daysWithTrips}
                onSeen={() => {
                  accountPromptSeenRef.current = true
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">
                <Emoji name="airplane" />
              </span>
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
              <span className="text-2xl">
                <Emoji name="calendar" />
              </span>
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
        open={unlockedOpen}
        onOpenChange={setUnlockedOpen}
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

      {videoReturn && (
        <AnimatedVideoDialog
          open={videoReturnOpen}
          onOpenChange={setVideoReturnOpen}
          calendarData={calendarData}
          year={videoReturn.year}
          month={videoReturn.month}
          exportType={videoReturn.exportType}
          price={VIDEO_PACK_PRICE}
          initialKind={videoReturn.kind}
          initialTheme={videoReturn.theme}
          initialOrderId={videoReturn.orderId}
        />
      )}
    </CalendarAccountContext>
  )
}

export default Create
