import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { CalendarDays, RemoteCalendar } from './days'
import {
  type CalendarApi,
  calendarApi,
  clearSyncState,
  loadSyncState,
  needsSync,
  runCalendarSync,
  saveSyncState,
  UnauthorizedError,
} from './sync'

const D1 = '2026-03-10'
const D2 = '2026-03-11'

function fakeServer(initial: RemoteCalendar = { days: {}, version: 0 }) {
  let current = initial
  const api: CalendarApi = {
    fetch: vi.fn(async () => current),
    push: vi.fn(async (days: CalendarDays, baseVersion: number) => {
      if (baseVersion !== current.version) {
        return { ok: false as const, remote: current }
      }
      current = { days, version: current.version + 1 }
      return { ok: true as const, version: current.version }
    }),
  }
  return {
    api,
    get: () => current,
    set: (next: RemoteCalendar) => {
      current = next
    },
  }
}

function fakeDevice(initial: CalendarDays) {
  let days = initial
  return {
    readLocal: () => days,
    writeLocal: vi.fn((next: CalendarDays) => {
      days = next
    }),
    get: () => days,
    set: (next: CalendarDays) => {
      days = next
    },
  }
}

function sync(
  server: ReturnType<typeof fakeServer>,
  device: ReturnType<typeof fakeDevice>,
  refresh: boolean,
  userId = 'ana'
) {
  return runCalendarSync({
    userId,
    refresh,
    readLocal: device.readLocal,
    writeLocal: device.writeLocal,
    api: server.api,
  })
}

describe('runCalendarSync', () => {
  beforeEach(() => {
    clearSyncState()
  })

  it('uploads this device’s trips the first time someone signs in', async () => {
    const server = fakeServer()
    const device = fakeDevice({ [D1]: ['FR'] })

    await sync(server, device, true)

    expect(server.get()).toEqual({ days: { [D1]: ['FR'] }, version: 1 })
    expect(device.writeLocal).not.toHaveBeenCalled()
    expect(loadSyncState()).toEqual({
      userId: 'ana',
      version: 1,
      base: { [D1]: ['FR'] },
    })
  })

  it('combines this device and the account when both have trips', async () => {
    const server = fakeServer({ days: { [D2]: ['DE'] }, version: 1 })
    const device = fakeDevice({ [D1]: ['FR'] })

    await sync(server, device, true)

    const both = { [D1]: ['FR'], [D2]: ['DE'] }
    expect(server.get()).toEqual({ days: both, version: 2 })
    expect(device.get()).toEqual(both)
  })

  it('downloads the account onto an empty device without saving', async () => {
    const server = fakeServer({ days: { [D1]: ['FR'] }, version: 4 })
    const device = fakeDevice({})

    await sync(server, device, true)

    expect(device.get()).toEqual({ [D1]: ['FR'] })
    expect(server.api.push).not.toHaveBeenCalled()
    expect(loadSyncState()?.version).toBe(4)
  })

  it('does nothing after a change-triggered run when nothing changed', async () => {
    const server = fakeServer()
    const device = fakeDevice({ [D1]: ['FR'] })
    await sync(server, device, true)
    vi.mocked(server.api.fetch).mockClear()
    vi.mocked(server.api.push).mockClear()

    expect(await sync(server, device, false)).toEqual({ pending: false })
    expect(server.api.fetch).not.toHaveBeenCalled()
    expect(server.api.push).not.toHaveBeenCalled()
  })

  it('saves a change on top of the last version without fetching first', async () => {
    const server = fakeServer()
    const device = fakeDevice({ [D1]: ['FR'] })
    await sync(server, device, true)
    vi.mocked(server.api.fetch).mockClear()

    device.set({ [D1]: ['FR', 'DE'] })
    await sync(server, device, false)

    expect(server.api.fetch).not.toHaveBeenCalled()
    expect(server.get()).toEqual({ days: { [D1]: ['FR', 'DE'] }, version: 2 })
  })

  it('merges in a change another device saved in the meantime', async () => {
    const server = fakeServer()
    const device = fakeDevice({ [D1]: ['FR'], [D2]: ['IT'] })
    await sync(server, device, true)

    server.set({
      days: { [D1]: ['FR'], [D2]: ['IT'], '2026-03-12': ['ES'] },
      version: 2,
    })
    device.set({ [D1]: ['FR'] })
    await sync(server, device, false)

    const merged = { [D1]: ['FR'], '2026-03-12': ['ES'] }
    expect(server.get()).toEqual({ days: merged, version: 3 })
    expect(device.get()).toEqual(merged)
  })

  it('picks up another device’s changes when refreshing', async () => {
    const server = fakeServer()
    const device = fakeDevice({ [D1]: ['FR'] })
    await sync(server, device, true)

    server.set({ days: { [D1]: ['FR'], [D2]: ['DE'] }, version: 2 })
    await sync(server, device, true)

    expect(device.get()).toEqual({ [D1]: ['FR'], [D2]: ['DE'] })
    expect(loadSyncState()?.version).toBe(2)
  })

  it('keeps edits made on this device while a save was in flight', async () => {
    const server = fakeServer({ days: { [D2]: ['DE'] }, version: 1 })
    const device = fakeDevice({ [D1]: ['FR'] })
    const push = server.api.push
    server.api.push = vi.fn(async (days, baseVersion) => {
      device.set({ [D1]: ['FR'], '2026-03-12': ['ES'] })
      return push(days, baseVersion)
    })

    const result = await sync(server, device, true)

    expect(device.get()).toEqual({
      [D1]: ['FR'],
      [D2]: ['DE'],
      '2026-03-12': ['ES'],
    })
    expect(result).toEqual({ pending: true })
    expect(loadSyncState()?.base).toEqual({ [D1]: ['FR'], [D2]: ['DE'] })
  })

  it('treats the account as new when someone else signs in on this device', async () => {
    saveSyncState({ userId: 'ana', version: 7, base: { [D1]: ['FR'] } })
    const server = fakeServer({ days: { [D2]: ['DE'] }, version: 1 })
    const device = fakeDevice({ [D1]: ['FR'] })

    await sync(server, device, true, 'ben')

    expect(server.get().days).toEqual({ [D1]: ['FR'], [D2]: ['DE'] })
    expect(loadSyncState()?.userId).toBe('ben')
  })

  it('gives up when the calendar keeps changing elsewhere', async () => {
    const server = fakeServer()
    let version = 0
    server.api.push = vi.fn(async () => ({
      ok: false as const,
      remote: { days: { [D2]: [`D${version}`] }, version: ++version },
    }))

    await expect(
      sync(server, fakeDevice({ [D1]: ['FR'] }), true)
    ).rejects.toThrow('kept changing')
  })
})

describe('runCalendarSync on a first sign-in with trips on both sides', () => {
  beforeEach(() => {
    clearSyncState()
  })

  function syncWithChoice(
    server: ReturnType<typeof fakeServer>,
    device: ReturnType<typeof fakeDevice>,
    choice: 'merge' | 'account'
  ) {
    const chooseFirstSync = vi.fn(async () => choice)
    return {
      chooseFirstSync,
      result: runCalendarSync({
        userId: 'ana',
        refresh: true,
        readLocal: device.readLocal,
        writeLocal: device.writeLocal,
        chooseFirstSync,
        api: server.api,
      }),
    }
  }

  it('asks, with a summary, before adding this device’s trips', async () => {
    const server = fakeServer({ days: { [D2]: ['DE'] }, version: 1 })
    const device = fakeDevice({ [D1]: ['FR'] })

    const { chooseFirstSync, result } = syncWithChoice(server, device, 'merge')
    await result

    expect(chooseFirstSync).toHaveBeenCalledWith({
      newDays: 1,
      accountDays: 1,
      crowdedDays: 0,
    })
    expect(server.get().days).toEqual({ [D1]: ['FR'], [D2]: ['DE'] })
    expect(device.get()).toEqual({ [D1]: ['FR'], [D2]: ['DE'] })
  })

  it('replaces this device’s trips with the account’s when asked to', async () => {
    const server = fakeServer({ days: { [D2]: ['DE'] }, version: 1 })
    const device = fakeDevice({ [D1]: ['FR'] })

    const { result } = syncWithChoice(server, device, 'account')
    await result

    expect(device.get()).toEqual({ [D2]: ['DE'] })
    expect(server.api.push).not.toHaveBeenCalled()
    expect(loadSyncState()).toEqual({
      userId: 'ana',
      version: 1,
      base: { [D2]: ['DE'] },
    })
  })

  it.each([
    ['the account is empty', { days: {}, version: 0 }, { [D1]: ['FR'] }],
    ['the device is empty', { days: { [D1]: ['FR'] }, version: 1 }, {}],
    [
      'the account already has everything',
      { days: { [D1]: ['FR', 'DE'] }, version: 1 },
      { [D1]: ['FR'] },
    ],
  ])('doesn’t ask when %s', async (_label, remote, local) => {
    const server = fakeServer(remote)
    const { chooseFirstSync, result } = syncWithChoice(
      server,
      fakeDevice(local),
      'account'
    )
    await result

    expect(chooseFirstSync).not.toHaveBeenCalled()
  })

  it('doesn’t ask again once this device has synced with the account', async () => {
    saveSyncState({ userId: 'ana', version: 1, base: { [D2]: ['DE'] } })
    const server = fakeServer({ days: { [D2]: ['DE'] }, version: 1 })

    const { chooseFirstSync, result } = syncWithChoice(
      server,
      fakeDevice({ [D1]: ['FR'], [D2]: ['DE'] }),
      'account'
    )
    await result

    expect(chooseFirstSync).not.toHaveBeenCalled()
    expect(server.get().days).toEqual({ [D1]: ['FR'], [D2]: ['DE'] })
  })
})

describe('needsSync', () => {
  beforeEach(() => {
    clearSyncState()
  })

  it('is true until this person has synced these exact trips', () => {
    expect(needsSync('ana', { [D1]: ['FR'] })).toBe(true)

    saveSyncState({ userId: 'ana', version: 1, base: { [D1]: ['FR'] } })
    expect(needsSync('ana', { [D1]: ['FR'] })).toBe(false)
    expect(needsSync('ana', {})).toBe(true)
    expect(needsSync('ben', { [D1]: ['FR'] })).toBe(true)
  })
})

describe('calendarApi', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  function reply(status: number, body: unknown) {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(body), { status }))
  }

  it('loads the account calendar', async () => {
    reply(200, { days: { [D1]: ['FR'] }, version: 2 })

    expect(await calendarApi.fetch()).toEqual({
      days: { [D1]: ['FR'] },
      version: 2,
    })
  })

  it('reports a successful save', async () => {
    reply(200, { version: 3 })

    expect(await calendarApi.push({ [D1]: ['FR'] }, 2)).toEqual({
      ok: true,
      version: 3,
    })
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/calendar',
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ days: { [D1]: ['FR'] }, baseVersion: 2 }),
      })
    )
  })

  it('returns the latest calendar on a conflict', async () => {
    reply(409, { days: { [D2]: ['DE'] }, version: 5 })

    expect(await calendarApi.push({}, 2)).toEqual({
      ok: false,
      remote: { days: { [D2]: ['DE'] }, version: 5 },
    })
  })

  it('signals when the person is no longer signed in', async () => {
    reply(401, { error: 'Unauthorized' })

    await expect(calendarApi.fetch()).rejects.toBeInstanceOf(UnauthorizedError)
  })

  it('throws on other failures', async () => {
    reply(500, {})

    await expect(calendarApi.push({}, 0)).rejects.toThrow('500')
  })
})
