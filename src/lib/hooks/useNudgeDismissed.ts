import { useSyncExternalStore } from 'react'

const NUDGE_STORAGE_KEY = 'yearly_travel_nudge_dismissed'
const listeners = new Set<() => void>()

function dismissedMonth(): string | null {
  try {
    return localStorage.getItem(NUDGE_STORAGE_KEY)
  } catch {
    return null
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function dismissTravelNudge(monthKey: string) {
  try {
    localStorage.setItem(NUDGE_STORAGE_KEY, monthKey)
  } catch {
    // Storage can be unavailable (private mode, quota); dismissing is best-effort
  }
  listeners.forEach((listener) => listener())
}

export function useNudgeDismissedMonth(): string | null {
  return useSyncExternalStore(subscribe, dismissedMonth, () => null)
}
