'use client'

import { useState, useRef } from 'react'
import type { CalendarData } from './lib/types'
import { loadCalendarData, saveCalendarData } from './lib/storage'
import CalendarGrid from './components/CalendarGrid'
import CountryInput from './components/CountryInput'
import ImageExportButton from './components/ImageExportButton'
import Statistics from './components/Statistics'
import DeveloperMode from './components/DeveloperMode'
import Settings, {
  type FlagDisplayMode,
  type WeekStartsOn,
} from './components/Settings'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/app/components/ui/card'

function getInitialData(): CalendarData {
  if (typeof window === 'undefined') {
    return { visits: [] }
  }
  return loadCalendarData() || { visits: [] }
}

export default function Home() {
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  )
  const [calendarData, setCalendarData] = useState<CalendarData>(getInitialData)
  const [flagDisplayMode, setFlagDisplayMode] =
    useState<FlagDisplayMode>('emoji')
  const [weekStartsOn, setWeekStartsOn] = useState<WeekStartsOn>(0)
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

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-50 via-white to-gray-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950">
      <header className="border-b border-gray-200/50 dark:border-gray-800/50 backdrop-blur-xl bg-white/80 dark:bg-zinc-950/80 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-linear-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                Countries in Year
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Track your travel adventures
              </p>
            </div>
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
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
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
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
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
              <Card className="border-0 shadow-xl bg-linear-to-br from-blue-500 to-purple-600 text-white">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className="text-2xl">📸</span>
                    Export Your Calendar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-sm text-white/90 font-normal">
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

            <Card className="border-0 shadow-lg bg-linear-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Statistics calendarData={calendarData} year={selectedYear} />
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="text-2xl">⚙️</span>
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Settings
                  flagDisplayMode={flagDisplayMode}
                  onFlagDisplayModeChange={setFlagDisplayMode}
                  weekStartsOn={weekStartsOn}
                  onWeekStartsOnChange={setWeekStartsOn}
                />
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-8">
        <Card className="border-0 shadow-lg">
          <details>
            <summary className="px-6 py-4 cursor-pointer font-medium text-sm hover:bg-accent/50 transition-colors rounded-lg list-none flex items-center gap-2">
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
