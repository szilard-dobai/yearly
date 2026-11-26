'use client'

import {
  BadgeDetailsDialog,
  BadgeGrid,
} from '@/components/badges/BadgeCollection'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StandardCard } from '@/components/ui/card-variants'
import { computeBadges, earnedBadges, type Badge } from '@/lib/badges'
import type { CalendarDays } from '@/lib/calendar-sync/days'
import { useTodayKey } from '@/lib/hooks/useTodayKey'
import { toDayMap } from '@/lib/trips'
import { useMemo, useState } from 'react'

export default function AccountBadges({
  days,
  today,
}: {
  days: CalendarDays
  today?: Date
}) {
  const todayKey = useTodayKey(today)
  const badges = useMemo(
    () =>
      todayKey ? computeBadges(toDayMap(Object.entries(days)), todayKey) : null,
    [days, todayKey]
  )
  const [selected, setSelected] = useState<Badge | null>(null)

  if (!badges) return null

  const earned = earnedBadges(badges).length

  return (
    <StandardCard>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Badges</CardTitle>
          <span className="text-sm text-gray-500 tabular-nums dark:text-zinc-400">
            {earned}/{badges.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-gray-600 dark:text-zinc-400">
          {earned > 0
            ? 'Badges come from the trips in your calendar. Planned trips count once their day comes.'
            : 'Add your first trip to earn your first badge.'}
        </p>
        <BadgeGrid badges={badges} onSelect={setSelected} />
        <BadgeDetailsDialog
          badge={selected}
          onClose={() => setSelected(null)}
        />
      </CardContent>
    </StandardCard>
  )
}
