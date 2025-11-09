'use client'

import { useState, useRef } from 'react'
import type { CalendarData } from './lib/types'
import { loadCalendarData, saveCalendarData } from './lib/storage'
import CalendarGrid from './components/CalendarGrid'
import CountryInput from './components/CountryInput'
import ExportButton from './components/ExportButton'
import ImportButton from './components/ImportButton'
import ImageExportButton from './components/ImageExportButton'
import Statistics from './components/Statistics'
import DeveloperMode from './components/DeveloperMode'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'

function getInitialData(): CalendarData {
  if (typeof window === 'undefined') {
    return { visits: [] }
  }
  return loadCalendarData() || { visits: [] }
}

export default function Home() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
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
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Countries in Year
            </h1>
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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
          <div className="space-y-6">
            <CalendarGrid
              ref={calendarRef}
              year={selectedYear}
              calendarData={calendarData}
              onRemoveVisit={handleRemoveVisit}
            />
          </div>

          <aside className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <Statistics calendarData={calendarData} year={selectedYear} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Add Visit</CardTitle>
              </CardHeader>
              <CardContent>
                <CountryInput
                  calendarData={calendarData}
                  onDataChange={handleDataChange}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <ExportButton calendarData={calendarData} />
                <ImportButton
                  currentData={calendarData}
                  onImport={handleDataChange}
                />
                <ImageExportButton
                  calendarRef={calendarRef}
                  year={selectedYear}
                  hasData={calendarData.visits.length > 0}
                />
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-8">
        <details className="rounded-lg border border-gray-200 dark:border-gray-800">
          <summary className="px-4 py-3 cursor-pointer font-medium text-sm text-gray-700 dark:text-gray-300">
            Developer Mode
          </summary>
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
            <DeveloperMode />
          </div>
        </details>
      </footer>
    </div>
  )
}
