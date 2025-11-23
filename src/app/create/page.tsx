'use client'

import CalendarGrid from '@/components/CalendarGrid'
import CountryInput from '@/components/CountryInput'
import DeveloperMode from '@/components/DeveloperMode'
import ImageExportButton from '@/components/ImageExportButton'
import Settings, {
  type FlagDisplayMode,
  type WeekStartsOn,
} from '@/components/Settings'
import Statistics from '@/components/Statistics'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  loadCalendarData,
  saveCalendarData,
  loadSettings,
  saveSettings,
} from '@/lib/storage'
import type { CalendarData } from '@/lib/types'
import { useRef, useState } from 'react'
import { YearlyLogo } from '@/components/YearlyLogo'

function getInitialData(): CalendarData {
  if (typeof window === 'undefined') {
    return { visits: [] }
  }
  return loadCalendarData() || { visits: [] }
}

function getInitialSettings() {
  if (typeof window === 'undefined') {
    return { flagDisplayMode: 'emoji' as FlagDisplayMode, weekStartsOn: 0 as WeekStartsOn }
  }
  return loadSettings()
}

export default function Create() {
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  )
  const [calendarData, setCalendarData] = useState<CalendarData>(getInitialData)
  const initialSettings = getInitialSettings()
  const [flagDisplayMode, setFlagDisplayMode] =
    useState<FlagDisplayMode>(initialSettings.flagDisplayMode)
  const [weekStartsOn, setWeekStartsOn] = useState<WeekStartsOn>(
    initialSettings.weekStartsOn
  )
  const calendarRef = useRef<HTMLDivElement>(null)

  const handleDataChange = (newData: CalendarData) => {
    setCalendarData(newData)
    saveCalendarData(newData)
  }

  const handleRemoveVisit = (visitId: string) => {
    const newData = {
      visits: calendarData.visits.filter((visit) => visit.id !== visitId),
    }
    handleDataChange(newData)
  }

  const handleFlagDisplayModeChange = (mode: FlagDisplayMode) => {
    setFlagDisplayMode(mode)
    saveSettings({ flagDisplayMode: mode, weekStartsOn })
  }

  const handleWeekStartsOnChange = (day: WeekStartsOn) => {
    setWeekStartsOn(day)
    saveSettings({ flagDisplayMode, weekStartsOn: day })
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-stone-50 via-white to-zinc-50">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <YearlyLogo />
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(Number(value))}
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
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6">
          <div className="space-y-6">
            <CalendarGrid
              ref={calendarRef}
              year={selectedYear}
              calendarData={calendarData}
              onRemoveVisit={handleRemoveVisit}
              flagDisplayMode={flagDisplayMode}
              weekStartsOn={weekStartsOn}
            />
          </div>

          <aside className="space-y-4">
            <Card className="shadow-sm border border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-gray-900" style={{ fontWeight: '500' }}>
                  <span className="text-2xl">✈️</span>
                  Add Visit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CountryInput
                  year={selectedYear}
                  calendarData={calendarData}
                  onDataChange={handleDataChange}
                  weekStartsOn={weekStartsOn}
                />
              </CardContent>
            </Card>

            {calendarData.visits.length > 0 && (
              <Card className="shadow-sm border-0 bg-black text-white">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2" style={{ fontWeight: '500' }}>
                    <span className="text-2xl">📸</span>
                    Export Your Calendar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-gray-300" style={{ lineHeight: '1.7' }}>
                      Download a high-quality image of your travel calendar
                    </p>
                    <ImageExportButton
                      calendarRef={calendarRef}
                      year={selectedYear}
                      hasData={calendarData.visits.length > 0}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-sm border border-gray-200 bg-linear-to-br from-gray-50 to-stone-50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-gray-900" style={{ fontWeight: '500' }}>
                  <span className="text-2xl">📊</span>
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Statistics calendarData={calendarData} year={selectedYear} />
              </CardContent>
            </Card>

            <Card className="shadow-sm border border-gray-200 bg-white">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-gray-900" style={{ fontWeight: '500' }}>
                  <span className="text-2xl">⚙️</span>
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Settings
                  flagDisplayMode={flagDisplayMode}
                  onFlagDisplayModeChange={handleFlagDisplayModeChange}
                  weekStartsOn={weekStartsOn}
                  onWeekStartsOnChange={handleWeekStartsOnChange}
                />
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <footer className="container mx-auto px-6 py-8">
        <Card className="shadow-sm border border-gray-200 bg-white">
          <details>
            <summary className="px-6 py-4 cursor-pointer text-gray-900 text-sm hover:bg-gray-50 transition-colors rounded-lg list-none flex items-center gap-2" style={{ fontWeight: '500' }}>
              <span className="text-lg">🔧</span>
              Developer Mode
            </summary>
            <div className="px-6 pb-4 pt-2">
              <DeveloperMode
                calendarData={calendarData}
                onDataChange={handleDataChange}
              />
            </div>
          </details>
        </Card>
      </footer>
    </div>
  )
}
