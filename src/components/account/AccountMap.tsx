'use client'

import WorldMapPanel from '@/components/map/WorldMapPanel'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StandardCard } from '@/components/ui/card-variants'
import type { CalendarDays } from '@/lib/calendar-sync/days'
import { toDayMap } from '@/lib/trips'
import { useMemo } from 'react'

export default function AccountMap({ days }: { days: CalendarDays }) {
  const dayMap = useMemo(() => toDayMap(Object.entries(days)), [days])

  if (dayMap.size === 0) return null

  return (
    <StandardCard>
      <CardHeader>
        <CardTitle className="text-base font-medium">World map</CardTitle>
      </CardHeader>
      <CardContent>
        <WorldMapPanel dayMap={dayMap} year={null} source="account" />
      </CardContent>
    </StandardCard>
  )
}
