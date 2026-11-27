'use client'

import { Emoji } from '@/components/Emoji'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StandardCard } from '@/components/ui/card-variants'
import { buildDayMap } from '@/lib/trips'
import type { CalendarData } from '@/lib/types'
import { useMemo } from 'react'
import MapExportButton from './MapExportButton'
import WorldMapPanel from './WorldMapPanel'

interface WorldMapCardProps {
  calendarData: CalendarData
  year: number
}

export default function WorldMapCard({
  calendarData,
  year,
}: WorldMapCardProps) {
  const dayMap = useMemo(
    () => buildDayMap(calendarData.visits),
    [calendarData.visits]
  )

  return (
    <StandardCard>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-zinc-100">
          <span className="text-2xl">
            <Emoji name="worldMap" />
          </span>
          World map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <WorldMapPanel
          dayMap={dayMap}
          year={year}
          source="create"
          actions={(view) => (
            <MapExportButton
              calendarData={calendarData}
              previewYear={year}
              source="map_card"
              variant="default"
              {...view}
            />
          )}
        />
      </CardContent>
    </StandardCard>
  )
}
