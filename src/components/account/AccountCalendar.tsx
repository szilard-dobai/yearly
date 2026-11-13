'use client'

import {
  countCalendarDays,
  fromCalendarDays,
  toCalendarDays,
} from '@/lib/calendar-sync/days'
import {
  type FirstSyncRequest,
  runCalendarSync,
} from '@/lib/calendar-sync/sync'
import { loadCalendarData, saveCalendarData } from '@/lib/storage'
import Link from 'next/link'
import FirstSyncDialog from './FirstSyncDialog'
import { useEffect, useState } from 'react'

type State =
  | { status: 'loading' }
  | { status: 'saved'; days: number }
  | { status: 'error' }

function readLocal() {
  return toCalendarDays(loadCalendarData()?.visits ?? [])
}

export default function AccountCalendar({ userId }: { userId: string }) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [firstSyncRequest, setFirstSyncRequest] =
    useState<FirstSyncRequest | null>(null)

  useEffect(() => {
    let cancelled = false
    runCalendarSync({
      userId,
      refresh: true,
      readLocal,
      chooseFirstSync: (summary) =>
        new Promise((resolve) => {
          setFirstSyncRequest({
            summary,
            resolve: (choice) => {
              setFirstSyncRequest(null)
              resolve(choice)
            },
          })
        }),
      writeLocal: (days) =>
        saveCalendarData({
          visits: fromCalendarDays(days, loadCalendarData()?.visits ?? []),
        }),
    })
      .then(() => {
        if (!cancelled) {
          setState({ status: 'saved', days: countCalendarDays(readLocal()) })
        }
      })
      .catch((error: unknown) => {
        console.error('Failed to sync calendar:', error)
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const linkClassName =
    'font-medium text-gray-900 underline underline-offset-2 dark:text-zinc-100'

  return (
    <div
      role="status"
      className="space-y-2 text-sm text-gray-600 dark:text-zinc-400"
    >
      {state.status === 'loading' && <p>Checking your saved trips…</p>}
      {state.status === 'error' && (
        <p>We couldn&apos;t reach your saved trips. Try again in a moment.</p>
      )}
      {state.status === 'saved' && (
        <p>
          {state.days > 0
            ? `${state.days} ${state.days === 1 ? 'day of trips is' : 'days of trips are'} saved to your account.`
            : 'Trips you add are saved to your account.'}{' '}
          They show up on any device where you sign in.
        </p>
      )}
      <FirstSyncDialog request={firstSyncRequest} />
      <p>
        <Link href="/create" className={linkClassName}>
          Open your calendar
        </Link>
      </p>
    </div>
  )
}
