'use client'

import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StandardCard } from '@/components/ui/card-variants'
import type { CalendarDays } from '@/lib/calendar-sync/days'
import { useState } from 'react'
import AccountBadges from './AccountBadges'
import AccountCalendar from './AccountCalendar'
import AccountMap from './AccountMap'

export default function AccountTrips({ userId }: { userId: string }) {
  const [days, setDays] = useState<CalendarDays | null>(null)

  return (
    <>
      <StandardCard>
        <CardHeader>
          <CardTitle className="text-base font-medium">Your calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountCalendar userId={userId} onSaved={setDays} />
        </CardContent>
      </StandardCard>

      {days && <AccountMap days={days} />}
      {days && <AccountBadges days={days} />}
    </>
  )
}
