'use client'

import { useEffect, useState } from 'react'
import { getReminderStatus } from './client'

export type ReminderStatus = boolean | 'error' | null

export function useReminderStatus(year: number, accountEmail: string | null) {
  const [status, setStatus] = useState<ReminderStatus>(null)

  useEffect(() => {
    if (!accountEmail) return
    let cancelled = false
    getReminderStatus(year)
      .then((value) => {
        if (!cancelled) setStatus(value)
      })
      .catch(() => {
        if (!cancelled) setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [year, accountEmail])

  return [status, setStatus] as const
}
