import { clearCalendarData, loadCalendarData } from '@/lib/storage'
import { sameCalendarDays, toCalendarDays } from './days'
import { clearSyncState, loadSyncState } from './sync'

export function forgetSyncedCalendar() {
  const state = loadSyncState()
  const local = loadCalendarData()
  const isSaved =
    state !== null &&
    (local === null ||
      sameCalendarDays(toCalendarDays(local.visits), state.base))

  if (isSaved) clearCalendarData()
  clearSyncState()
}
