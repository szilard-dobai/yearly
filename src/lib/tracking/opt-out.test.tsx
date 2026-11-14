import { dropWhenOptedOut } from '@/components/SiteAnalytics'
import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { trackEvent } from './index'
import {
  isTrackingOptedOut,
  setTrackingOptedOut,
  useTrackingOptedOut,
} from './opt-out'

describe('usage stats opt-out', () => {
  const fetchMock = vi.fn(() => Promise.resolve(new Response('{}')))

  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockClear()
  })

  it('sends usage events by default', async () => {
    await trackEvent('create_page_view')

    expect(fetchMock).toHaveBeenCalledWith('/api/tracking', expect.anything())
  })

  it('sends nothing once usage stats are turned off', async () => {
    setTrackingOptedOut(true)

    await trackEvent('create_page_view')

    expect(isTrackingOptedOut()).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('drops Vercel analytics events once turned off', () => {
    const event = { url: 'https://yearly.world/' }
    expect(dropWhenOptedOut(event)).toBe(event)

    setTrackingOptedOut(true)
    expect(dropWhenOptedOut(event)).toBeNull()
  })

  it('lets components follow the setting', () => {
    const { result } = renderHook(() => useTrackingOptedOut())
    expect(result.current).toBe(false)

    act(() => setTrackingOptedOut(true))
    expect(result.current).toBe(true)

    act(() => setTrackingOptedOut(false))
    expect(result.current).toBe(false)
  })
})
