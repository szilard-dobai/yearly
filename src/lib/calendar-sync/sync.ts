import { z } from 'zod'
import {
  type CalendarDays,
  calendarDaysSchema,
  type FirstSyncSummary,
  mergeCalendarDays,
  type RemoteCalendar,
  sameCalendarDays,
  summarizeFirstSync,
} from './days'

const SYNC_STATE_KEY = 'yearly-calendar-sync'
const MAX_CONFLICT_RETRIES = 3

const syncStateSchema = z.object({
  userId: z.string().min(1),
  version: z.number().int().min(0),
  base: calendarDaysSchema,
})

const remoteCalendarSchema = z.object({
  days: calendarDaysSchema,
  version: z.number().int().min(0),
})

export type SyncState = z.infer<typeof syncStateSchema>

export class UnauthorizedError extends Error {}

export type FirstSyncChoice = 'merge' | 'account'

export interface SyncResult {
  pending: boolean
  firstSync: FirstSyncChoice | 'auto' | null
}

export interface FirstSyncRequest {
  summary: FirstSyncSummary
  resolve: (choice: FirstSyncChoice) => void
}

export type PushResult =
  | { ok: true; version: number }
  | { ok: false; remote: RemoteCalendar }

export interface CalendarApi {
  fetch: () => Promise<RemoteCalendar>
  push: (days: CalendarDays, baseVersion: number) => Promise<PushResult>
}

export function loadSyncState(): SyncState | null {
  try {
    const json = localStorage.getItem(SYNC_STATE_KEY)
    if (!json) return null
    const result = syncStateSchema.safeParse(JSON.parse(json))
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export function saveSyncState(state: SyncState) {
  try {
    localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Failed to save calendar sync state:', error)
  }
}

export function clearSyncState() {
  try {
    localStorage.removeItem(SYNC_STATE_KEY)
  } catch {}
}

export function needsSync(userId: string, local: CalendarDays) {
  const state = loadSyncState()
  return state?.userId !== userId || !sameCalendarDays(local, state.base)
}

async function readJson(response: Response) {
  if (response.status === 401) throw new UnauthorizedError()
  if (!response.ok && response.status !== 409) {
    throw new Error(`Calendar request failed with ${response.status}`)
  }
  return response.json()
}

export const calendarApi: CalendarApi = {
  async fetch() {
    const response = await fetch('/api/calendar', { cache: 'no-store' })
    return remoteCalendarSchema.parse(await readJson(response))
  },
  async push(days, baseVersion) {
    const response = await fetch('/api/calendar', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days, baseVersion }),
    })
    const body = await readJson(response)
    if (response.status === 409) {
      return { ok: false, remote: remoteCalendarSchema.parse(body) }
    }
    return { ok: true, version: z.number().int().parse(body.version) }
  },
}

interface SyncOptions {
  userId: string
  refresh: boolean
  readLocal: () => CalendarDays
  writeLocal: (days: CalendarDays) => void
  chooseFirstSync?: (summary: FirstSyncSummary) => Promise<FirstSyncChoice>
  api?: CalendarApi
}

export async function runCalendarSync({
  userId,
  refresh,
  readLocal,
  writeLocal,
  chooseFirstSync,
  api = calendarApi,
}: SyncOptions): Promise<SyncResult> {
  const state = loadSyncState()
  const mine = state?.userId === userId ? state : null
  const base = mine?.base ?? {}
  const local = readLocal()
  let firstSync: SyncResult['firstSync'] = mine ? null : 'auto'

  let remote: RemoteCalendar
  if (mine && !refresh) {
    if (sameCalendarDays(local, base)) return { pending: false, firstSync }
    const pushed = await api.push(local, mine.version)
    if (pushed.ok) {
      return finish(local, pushed.version)
    }
    remote = pushed.remote
  } else {
    remote = await api.fetch()
    if (!mine && chooseFirstSync) {
      const summary = summarizeFirstSync(local, remote.days)
      if (summary.newDays > 0 && summary.accountDays > 0) {
        firstSync = await chooseFirstSync(summary)
        if (firstSync === 'account') {
          return finish(remote.days, remote.version)
        }
      }
    }
  }

  for (let attempt = 0; ; attempt++) {
    const merged = mergeCalendarDays(base, local, remote.days)
    if (sameCalendarDays(merged, remote.days)) {
      return finish(merged, remote.version)
    }
    const pushed = await api.push(merged, remote.version)
    if (pushed.ok) return finish(merged, pushed.version)
    if (attempt >= MAX_CONFLICT_RETRIES) {
      throw new Error('Calendar kept changing on another device')
    }
    remote = pushed.remote
  }

  function finish(saved: CalendarDays, version: number) {
    const current = readLocal()
    const next = sameCalendarDays(current, local)
      ? saved
      : mergeCalendarDays(local, current, saved)
    if (!sameCalendarDays(next, current)) writeLocal(next)
    saveSyncState({ userId, version, base: saved })
    return { pending: !sameCalendarDays(next, saved), firstSync }
  }
}
