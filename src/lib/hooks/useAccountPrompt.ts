import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'yearly_account_prompt_dismissed_at'
const listeners = new Set<() => void>()

export const ACCOUNT_PROMPT_MIN_DAYS = 3
export const ACCOUNT_PROMPT_SNOOZE_DAYS = 30

function isDismissed(): boolean {
  try {
    const dismissedAt = Number(localStorage.getItem(STORAGE_KEY))
    if (!dismissedAt) return false
    return (
      Date.now() - dismissedAt <
      ACCOUNT_PROMPT_SNOOZE_DAYS * 24 * 60 * 60 * 1000
    )
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

export function dismissAccountPrompt() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {}
  listeners.forEach((listener) => listener())
}

export function useAccountPromptDismissed(): boolean {
  return useSyncExternalStore(subscribe, isDismissed, () => true)
}
