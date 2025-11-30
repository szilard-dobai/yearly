'use client'

import CalendarGrid from '@/components/CalendarGrid'
import CountryInput from '@/components/CountryInput'
import DeveloperMode from '@/components/DeveloperMode'
import Header from '@/components/Header'
import ImageExportButton from '@/components/ImageExportButton'
import Settings from '@/components/Settings'
import Statistics from '@/components/Statistics'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DarkCard, StandardCard } from '@/components/ui/card-variants'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { loadCalendarData, saveCalendarData } from '@/lib/storage'
import type { CalendarData } from '@/lib/types'
import { useRef, useState } from 'react'

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
    <>
      <Header>
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
      </Header>

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
                />
              </CardContent>
            </StandardCard>
          </div>

          <aside className="space-y-4">
            <StandardCard>
              <CardHeader>
                <CardTitle className="text-lg font-medium flex items-center gap-2 text-gray-900 dark:text-white">
                  <span className="text-2xl">✈️</span>
                  Add Visit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CountryInput
                  year={selectedYear}
                  calendarData={calendarData}
                  onDataChange={handleDataChange}
                />
              </CardContent>
            </StandardCard>

            {calendarData.visits.length > 0 && (
              <DarkCard>
                <CardHeader>
                  <CardTitle className="text-lg font-medium flex items-center gap-2">
                    <span className="text-2xl">📸</span>
                    Export Your Calendar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-gray-300 dark:text-gray-600 leading-relaxed">
                      Download a high-quality image of your travel calendar
                    </p>
                    <ImageExportButton
                      calendarRef={calendarRef}
                      year={selectedYear}
                      hasData={calendarData.visits.length > 0}
                    />
                  </div>
                </CardContent>
              </DarkCard>
            )}

            <StandardCard>
              <CardHeader>
                <CardTitle className="text-lg font-medium flex items-center gap-2 text-gray-900 dark:text-white">
                  <span className="text-2xl">📊</span>
                  Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Statistics calendarData={calendarData} year={selectedYear} />
              </CardContent>
            </StandardCard>

            <StandardCard>
              <CardHeader>
                <CardTitle className="text-lg font-medium flex items-center gap-2 text-gray-900 dark:text-white">
                  <span className="text-2xl">⚙️</span>
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Settings />
              </CardContent>
            </StandardCard>
          </aside>
        </div>

        <StandardCard className="p-0 overflow-hidden">
          <details>
            <summary className="px-6 py-4 cursor-pointer text-gray-900 dark:text-white text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors rounded-lg list-none flex items-center gap-2">
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
        </StandardCard>
      </main>
    </>
  )
}

export default Create
