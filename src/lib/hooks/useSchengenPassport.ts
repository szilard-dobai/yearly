import { useSyncExternalStore } from 'react'

export type SchengenPassport = 'free' | 'limited'

const PASSPORT_STORAGE_KEY = 'yearly_schengen_passport'
const listeners = new Set<() => void>()

function readPassport(): SchengenPassport | null {
  try {
    const value = localStorage.getItem(PASSPORT_STORAGE_KEY)
    return value === 'free' || value === 'limited' ? value : null
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

export function setSchengenPassport(passport: SchengenPassport | null) {
  try {
    if (passport) localStorage.setItem(PASSPORT_STORAGE_KEY, passport)
    else localStorage.removeItem(PASSPORT_STORAGE_KEY)
  } catch {
    // Storage can be unavailable (private mode, quota); the answer is best-effort
  }
  listeners.forEach((listener) => listener())
}

export function useSchengenPassport(): SchengenPassport | null {
  return useSyncExternalStore(subscribe, readPassport, () => null)
}
