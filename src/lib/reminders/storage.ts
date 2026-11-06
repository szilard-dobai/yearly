import type { ReminderMethod } from './types'

const STORAGE_KEY = 'yearly_year_end_reminder'
const METHODS: readonly unknown[] = ['ics', 'google', 'email']

function isReminderMethod(value: unknown): value is ReminderMethod {
  return METHODS.includes(value)
}

function readSaved(): Record<string, ReminderMethod> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return Object.fromEntries(
      Object.entries(parsed).filter(([, method]) => isReminderMethod(method))
    )
  } catch {
    return {}
  }
}

export function getSavedReminder(year: number): ReminderMethod | null {
  return readSaved()[year] ?? null
}

export function saveReminder(year: number, method: ReminderMethod): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...readSaved(), [year]: method })
    )
  } catch {}
}
