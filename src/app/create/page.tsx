'use client'

import CalendarGrid from '@/components/CalendarGrid'
import CountryInput from '@/components/CountryInput'
import DeveloperMode from '@/components/DeveloperMode'
import Header from '@/components/Header'
import CalendarExportButton from '@/components/CalendarExportButton'
import ImagePreviewModal from '@/components/ImagePreviewModal'
import MobileFab from '@/components/MobileFab'
import MonthlyExportLayout from '@/components/MonthlyExportLayout'
import Settings from '@/components/Settings'
import Statistics from '@/components/Statistics'
import StatisticsExportButton from '@/components/StatisticsExportButton'
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
import { getCountryByCode } from '@/lib/countries'
import { MONTH_NAMES, MONTH_NAMES_SHORT } from '@/lib/constants'
import { useImageExport } from '@/lib/hooks/useImageExport'
import { useMonthlyExport } from '@/lib/hooks/useMonthlyExport'
import { useStatisticsExport } from '@/lib/hooks/useStatisticsExport'
import { loadCalendarData, saveCalendarData } from '@/lib/storage'
import { trackEvent } from '@/lib/tracking'
import type { CalendarData } from '@/lib/types'
import { CalendarDays, Loader2, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

function getInitialData(): CalendarData {
  if (typeof window === 'undefined') {
    return { visits: [] }
  }
  return loadCalendarData() || { visits: [] }
}

function Create() {
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  )
  const [calendarData, setCalendarData] = useState<CalendarData>(getInitialData)
  const [undoStack, setUndoStack] = useState<CalendarData[]>([])
  const [isMobileAddDialogOpen, setIsMobileAddDialogOpen] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)
  const statisticsRef = useRef<HTMLDivElement>(null)
  const monthlyExportRef = useRef<HTMLDivElement>(null)
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  )
  const [isMobileMonthDialogOpen, setIsMobileMonthDialogOpen] = useState(false)

  const {
    exportImage,
    previewOpen: mobilePreviewOpen,
    setPreviewOpen: setMobilePreviewOpen,
    imageDataUrl: mobileImageDataUrl,
    filename: mobileFilename,
  } = useImageExport({ calendarRef, calendarData, year: selectedYear })

  const {
    exportStatistics,
    previewOpen: statsPreviewOpen,
    setPreviewOpen: setStatsPreviewOpen,
    imageDataUrl: statsImageDataUrl,
    filename: statsFilename,
  } = useStatisticsExport({ statisticsRef, calendarData, year: selectedYear })

  const {
    exportMonth,
    status: monthlyExportStatus,
    previewOpen: monthlyPreviewOpen,
    setPreviewOpen: setMonthlyPreviewOpen,
    imageDataUrl: monthlyImageDataUrl,
    filename: monthlyFilename,
  } = useMonthlyExport({
    monthlyExportRef,
    year: selectedYear,
    month: selectedMonth,
  })

  useEffect(() => {
    trackEvent('create_page_view')
  }, [])

  const handleDataChange = useCallback(
    (newData: CalendarData) => {
      setUndoStack((prev) => [...prev.slice(-9), calendarData])
      setCalendarData(newData)
      saveCalendarData(newData)
    },
    [calendarData]
  )

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return

    const previousData = undoStack[undoStack.length - 1]
    setUndoStack((prev) => prev.slice(0, -1))
    setCalendarData(previousData)
    saveCalendarData(previousData)

    trackEvent('visit_undo')
  }, [undoStack])

  const handleYearChange = (value: string) => {
    const newYear = Number(value)
    trackEvent('year_changed', {
      fromYear: selectedYear,
      toYear: newYear,
    })
    setSelectedYear(newYear)
  }

  const handleRemoveVisit = (visitId: string) => {
    const visit = calendarData.visits.find((v) => v.id === visitId)
    if (visit) {
      const country = getCountryByCode(visit.countryCode)
      trackEvent('visit_deleted', {
        countryCode: visit.countryCode,
        countryName: country?.name,
      })
    }
    const newData = {
      visits: calendarData.visits.filter((visit) => visit.id !== visitId),
    }
    handleDataChange(newData)
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
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 mb-16">
            <div className="space-y-6">
              <StandardCard>
                <CardContent>
                  <CalendarGrid
                    ref={calendarRef}
                    year={selectedYear}
                    calendarData={calendarData}
                    onRemoveVisit={handleRemoveVisit}
                    onMonthExport={handleMonthExport}
                  />
                </CardContent>
              </StandardCard>
              <div className="hidden">
                <MonthlyExportLayout
                  ref={monthlyExportRef}
                  calendarData={calendarData}
                  year={selectedYear}
                  month={selectedMonth}
                />
              </div>
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
                      <CalendarExportButton
                        calendarRef={calendarRef}
                        calendarData={calendarData}
                        year={selectedYear}
                      />
                      <StatisticsExportButton
                        statisticsRef={statisticsRef}
                        calendarData={calendarData}
                        year={selectedYear}
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
                  <CardTitle className="text-lg font-medium flex items-center gap-2 text-gray-900 dark:text-zinc-100">
                    <span className="text-2xl">📊</span>
                    Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Statistics
                    calendarData={calendarData}
                    year={selectedYear}
                    exportRef={statisticsRef}
                  />
                </CardContent>
              </StandardCard>

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
        </main>

        <div className="sticky bottom-0 right-0">
          <MobileFab
            onAddClick={() => setIsMobileAddDialogOpen(true)}
            onExportClick={exportImage}
            onExportStatsClick={exportStatistics}
            onExportMonthClick={() => setIsMobileMonthDialogOpen(true)}
            hasVisits={visitsForSelectedYear > 0}
          />
        </div>
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

      <ImagePreviewModal
        open={mobilePreviewOpen}
        onOpenChange={setMobilePreviewOpen}
        imageDataUrl={mobileImageDataUrl}
        filename={mobileFilename}
        year={selectedYear}
        calendarData={calendarData}
      />

      <ImagePreviewModal
        open={statsPreviewOpen}
        onOpenChange={setStatsPreviewOpen}
        imageDataUrl={statsImageDataUrl}
        filename={statsFilename}
        year={selectedYear}
        calendarData={calendarData}
      />

      <ImagePreviewModal
        open={monthlyPreviewOpen}
        onOpenChange={setMonthlyPreviewOpen}
        imageDataUrl={monthlyImageDataUrl}
        filename={monthlyFilename}
        year={selectedYear}
        calendarData={calendarData}
      />
    </>
  )
}

export default Create
