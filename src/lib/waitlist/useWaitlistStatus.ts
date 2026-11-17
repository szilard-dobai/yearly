'use client'

import { useEffect, useState } from 'react'
import { getWaitlistStatus } from './client'
import type { WaitlistFeature } from './types'

export function useWaitlistStatus(
  feature: WaitlistFeature,
  accountEmail: string | null
) {
  const [joined, setJoined] = useState<boolean | null>(null)

  useEffect(() => {
    if (!accountEmail) return
    let cancelled = false
    getWaitlistStatus(feature)
      .then((value) => {
        if (!cancelled) setJoined(value)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [feature, accountEmail])

  return [joined, setJoined] as const
}
