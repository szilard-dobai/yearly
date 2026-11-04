import { useSyncExternalStore } from 'react'

const HINT_STORAGE_KEY = 'yearly_calendar_hint_dismissed'
const listeners = new Set<() => void>()

function isDismissed(): boolean {
  try {
    return localStorage.getItem(HINT_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function dismissCalendarHint() {
  try {
    localStorage.setItem(HINT_STORAGE_KEY, '1')
  } catch {
    // Storage can be unavailable (private mode, quota); the hint is best-effort
  }
  listeners.forEach((listener) => listener())
}

export function useCalendarHintDismissed(): boolean {
  return useSyncExternalStore(subscribe, isDismissed, () => true)
}
