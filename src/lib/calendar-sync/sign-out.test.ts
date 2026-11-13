import { loadCalendarData, saveCalendarData } from '@/lib/storage'
import { beforeEach, describe, expect, it } from 'vitest'
import { forgetSyncedCalendar } from './sign-out'
import { clearSyncState, loadSyncState, saveSyncState } from './sync'

const FR_DAY = {
  visits: [{ id: '1', countryCode: 'FR', date: new Date(2026, 2, 10) }],
}

describe('forgetSyncedCalendar', () => {
  beforeEach(() => {
    localStorage.clear()
    clearSyncState()
  })

  it('removes trips that are saved in the account', () => {
    saveCalendarData(FR_DAY)
    saveSyncState({ userId: 'ana', version: 2, base: { '2026-03-10': ['FR'] } })

    forgetSyncedCalendar()

    expect(loadCalendarData()).toBeNull()
    expect(loadSyncState()).toBeNull()
  })

  it('keeps trips that have changes not yet saved to the account', () => {
    saveCalendarData(FR_DAY)
    saveSyncState({ userId: 'ana', version: 2, base: {} })

    forgetSyncedCalendar()

    expect(loadCalendarData()?.visits).toHaveLength(1)
    expect(loadSyncState()).toBeNull()
  })

  it('keeps trips on a device that never synced', () => {
    saveCalendarData(FR_DAY)

    forgetSyncedCalendar()

    expect(loadCalendarData()?.visits).toHaveLength(1)
  })
})
