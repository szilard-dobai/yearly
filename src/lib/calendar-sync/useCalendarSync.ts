'use client'

import { authClient } from '@/lib/auth/client'
import { trackEvent } from '@/lib/tracking'
import type { CalendarData } from '@/lib/types'
import { useCallback, useEffect, useRef, useState } from 'react'
import { fromCalendarDays, toCalendarDays } from './days'
import type { FirstSyncSummary } from './days'
import {
  type FirstSyncChoice,
  type FirstSyncRequest,
  needsSync,
  runCalendarSync,
  UnauthorizedError,
} from './sync'

export type SyncStatus = 'saving' | 'saved' | 'error'

export interface SyncAccount {
  id: string
  email: string
}

export const SAVE_DELAY_MS = 1000
export const RETRY_DELAY_MS = 15_000

interface CalendarSyncOptions {
  enabled: boolean
  calendarData: CalendarData
  onRemoteChange: (data: CalendarData) => void
}

export function useCalendarSync({
  enabled,
  calendarData,
  onRemoteChange,
}: CalendarSyncOptions) {
  const [account, setAccount] = useState<SyncAccount | null>(null)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [status, setStatus] = useState<SyncStatus>('saving')
  const [firstSyncRequest, setFirstSyncRequest] =
    useState<FirstSyncRequest | null>(null)
  const dataRef = useRef(calendarData)
  const onRemoteChangeRef = useRef(onRemoteChange)
  const accountRef = useRef<SyncAccount | null>(null)
  const runningRef = useRef(false)
  const queuedRef = useRef<boolean | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    dataRef.current = calendarData
    onRemoteChangeRef.current = onRemoteChange
  })

  const chooseFirstSync = useCallback(
    (summary: FirstSyncSummary) =>
      new Promise<FirstSyncChoice>((resolve) => {
        setFirstSyncRequest({
          summary,
          resolve: (choice) => {
            setFirstSyncRequest(null)
            resolve(choice)
          },
        })
      }),
    []
  )

  const run = useCallback(
    async (refresh: boolean): Promise<void> => {
      const current = accountRef.current
      if (!current) return
      if (runningRef.current) {
        queuedRef.current = (queuedRef.current ?? false) || refresh
        return
      }
      if (
        !refresh &&
        !needsSync(current.id, toCalendarDays(dataRef.current.visits))
      ) {
        return
      }

      runningRef.current = true
      clearTimeout(retryRef.current)
      setStatus('saving')
      let followUp: boolean | null = null

      try {
        const { pending, firstSync } = await runCalendarSync({
          userId: current.id,
          refresh,
          chooseFirstSync,
          readLocal: () => toCalendarDays(dataRef.current.visits),
          writeLocal: (days) => {
            const data = {
              visits: fromCalendarDays(days, dataRef.current.visits),
            }
            dataRef.current = data
            onRemoteChangeRef.current(data)
          },
        })
        setStatus('saved')
        if (firstSync) {
          trackEvent('account_calendar_linked', {
            choice: firstSync,
            source: 'create',
          })
        }
        if (pending) followUp = false
      } catch (error) {
        if (error instanceof UnauthorizedError) {
          accountRef.current = null
          setAccount(null)
        } else {
          console.error('Failed to sync calendar:', error)
          setStatus('error')
          retryRef.current = setTimeout(() => void run(true), RETRY_DELAY_MS)
        }
      } finally {
        runningRef.current = false
      }

      const next = queuedRef.current ?? followUp
      queuedRef.current = null
      if (next !== null) await run(next)
    },
    [chooseFirstSync]
  )

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    authClient
      .getSession()
      .then(({ data }) => {
        if (cancelled) return
        setSessionChecked(true)
        if (!data) return
        const next = { id: data.user.id, email: data.user.email }
        accountRef.current = next
        setAccount(next)
        void run(true)
      })
      .catch((error: unknown) => {
        console.error('Failed to check the session:', error)
      })
    return () => {
      cancelled = true
      clearTimeout(retryRef.current)
    }
  }, [enabled, run])

  useEffect(() => {
    if (!account) return
    const timer = setTimeout(() => void run(false), SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [account, calendarData, run])

  return { account, sessionChecked, status, firstSyncRequest }
}
