import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'yearly_usage_stats_off'
const listeners = new Set<() => void>()

export function isTrackingOptedOut(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function setTrackingOptedOut(optedOut: boolean) {
  try {
    if (optedOut) {
      localStorage.setItem(STORAGE_KEY, '1')
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {}
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useTrackingOptedOut(): boolean {
  return useSyncExternalStore(subscribe, isTrackingOptedOut, () => false)
}
