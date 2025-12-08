'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { TrackingEvent, TrackingEventType } from '@/lib/tracking/types'
import { Loader2, LogOut, RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

type SortField = 'timestamp' | 'type' | 'deviceId'
type SortOrder = 'asc' | 'desc'

const EVENT_TYPES: TrackingEventType[] = [
  'homepage_view',
  'create_page_view',
  'not_found_page_view',
  'homepage_cta_click',
  'not_found_home_click',
  'year_changed',
  'visit_add_attempt',
  'visit_deleted',
  'image_export_click',
  'image_download_click',
  'developer_mode_toggle',
  'json_import',
  'json_export',
]

interface Stats {
  total: number
  filtered: number
  uniqueDevices: number
  filteredUniqueDevices: number
  eventTypes: number
  filteredEventTypes: number
  uniqueCountries: number
  filteredUniqueCountries: number
  countries: string[]
  regions: string[]
}

export default function AnalyticsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  const [events, setEvents] = useState<TrackingEvent[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [isLoadingEvents, setIsLoadingEvents] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [eventsError, setEventsError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [deviceIdFilter, setDeviceIdFilter] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [countryFilter, setCountryFilter] = useState<string>('all')
  const [regionFilter, setRegionFilter] = useState<string>('all')

  const [sortField, setSortField] = useState<SortField>('timestamp')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const [selectedEvent, setSelectedEvent] = useState<TrackingEvent | null>(null)

  const loadMoreRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  const buildQueryParams = useCallback(
    (extraParams?: Record<string, string>) => {
      const params = new URLSearchParams()
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (deviceIdFilter) params.set('deviceId', deviceIdFilter)
      if (searchQuery) params.set('search', searchQuery)
      if (countryFilter !== 'all') params.set('country', countryFilter)
      if (regionFilter !== 'all') params.set('region', regionFilter)
      params.set('sortField', sortField)
      params.set('sortOrder', sortOrder)
      if (extraParams) {
        Object.entries(extraParams).forEach(([key, value]) => {
          params.set(key, value)
        })
      }
      return params.toString()
    },
    [typeFilter, deviceIdFilter, searchQuery, countryFilter, regionFilter, sortField, sortOrder]
  )

  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true)
    try {
      const response = await fetch(`/api/tracking/stats?${buildQueryParams()}`)
      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthenticated(false)
          return
        }
        throw new Error('Failed to fetch stats')
      }
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setIsLoadingStats(false)
    }
  }, [buildQueryParams])

  const fetchEvents = useCallback(
    async (resetOffset = true) => {
      const newOffset = resetOffset ? 0 : offset
      if (resetOffset) {
        setIsLoadingEvents(true)
        setOffset(0)
      } else {
        setIsLoadingMore(true)
      }
      setEventsError('')

      try {
        const response = await fetch(
          `/api/tracking?${buildQueryParams({ limit: '50', offset: String(newOffset) })}`
        )
        if (!response.ok) {
          if (response.status === 401) {
            setIsAuthenticated(false)
            return
          }
          throw new Error('Failed to fetch events')
        }

        const data = await response.json()
        if (resetOffset) {
          setEvents(data.events)
        } else {
          setEvents((prev) => [...prev, ...data.events])
        }
        setHasMore(data.hasMore)
        if (!resetOffset) {
          setOffset(newOffset + 50)
        } else {
          setOffset(50)
        }
      } catch (error) {
        setEventsError(error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setIsLoadingEvents(false)
        setIsLoadingMore(false)
      }
    },
    [buildQueryParams, offset]
  )

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchEvents(false)
    }
  }, [fetchEvents, hasMore, isLoadingMore])

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/tracking/stats')
        if (response.ok) {
          setIsAuthenticated(true)
        }
      } catch {
        // Not authenticated
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  useEffect(() => {
    if (!isAuthenticated) return

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchStats()
      fetchEvents(true)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isAuthenticated,
    typeFilter,
    deviceIdFilter,
    searchQuery,
    countryFilter,
    regionFilter,
    sortField,
    sortOrder,
  ])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoadingEvents) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasMore, isLoadingMore, isLoadingEvents, loadMore])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (response.ok) {
        setIsAuthenticated(true)
        setPassword('')
      } else {
        const data = await response.json()
        setAuthError(data.error || 'Invalid password')
      }
    } catch {
      setAuthError('Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    setIsAuthenticated(false)
    setEvents([])
    setStats(null)
  }

  const handleRefresh = () => {
    fetchStats()
    fetchEvents(true)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm space-y-4 p-6 border rounded-lg bg-white dark:bg-gray-900 shadow-lg"
        >
          <h1 className="text-xl font-semibold text-center">Admin Access</h1>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              autoFocus
            />
          </div>
          {authError && (
            <p className="text-sm text-red-500 text-center">{authError}</p>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              'Sign In'
            )}
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Analytics Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoadingStats || isLoadingEvents}
            >
              <RefreshCw
                className={`size-4 ${isLoadingStats || isLoadingEvents ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="size-4" />
              Logout
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 border rounded-lg bg-white dark:bg-gray-900">
          <div className="space-y-2">
            <Label>Event Type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {EVENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All countries" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All countries</SelectItem>
                {(stats?.countries ?? []).map((country) => (
                  <SelectItem key={country} value={country}>
                    {country}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Region</Label>
            <Select value={regionFilter} onValueChange={setRegionFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All regions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All regions</SelectItem>
                {(stats?.regions ?? []).map((region) => (
                  <SelectItem key={region} value={region}>
                    {region}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Device ID</Label>
            <Input
              className="w-full"
              placeholder="Filter by device ID..."
              value={deviceIdFilter}
              onChange={(e) => setDeviceIdFilter(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Search Metadata</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                placeholder="Search in metadata..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sort By</Label>
            <div className="flex gap-2">
              <Select
                value={sortField}
                onValueChange={(v) => setSortField(v as SortField)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="timestamp">Time</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                  <SelectItem value="deviceId">Device</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortOrder}
                onValueChange={(v) => setSortOrder(v as SortOrder)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Desc</SelectItem>
                  <SelectItem value="asc">Asc</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 border rounded-lg bg-white dark:bg-gray-900">
            <p className="text-sm text-gray-500">Total Events</p>
            <p className="text-2xl font-semibold">
              {isLoadingStats ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                (stats?.total ?? '-')
              )}
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-white dark:bg-gray-900">
            <p className="text-sm text-gray-500">Filtered</p>
            <p className="text-2xl font-semibold">
              {isLoadingStats ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                (stats?.filtered ?? '-')
              )}
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-white dark:bg-gray-900">
            <p className="text-sm text-gray-500">Unique Devices</p>
            <p className="text-2xl font-semibold">
              {isLoadingStats ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <>
                  {stats?.filteredUniqueDevices ?? '-'}
                  {stats &&
                    stats.filteredUniqueDevices !== stats.uniqueDevices && (
                      <span className="text-sm text-gray-400 font-normal ml-1">
                        / {stats.uniqueDevices}
                      </span>
                    )}
                </>
              )}
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-white dark:bg-gray-900">
            <p className="text-sm text-gray-500">Event Types</p>
            <p className="text-2xl font-semibold">
              {isLoadingStats ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <>
                  {stats?.filteredEventTypes ?? '-'}
                  {stats && stats.filteredEventTypes !== stats.eventTypes && (
                    <span className="text-sm text-gray-400 font-normal ml-1">
                      / {stats.eventTypes}
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
          <div className="p-4 border rounded-lg bg-white dark:bg-gray-900">
            <p className="text-sm text-gray-500">Unique Countries</p>
            <p className="text-2xl font-semibold">
              {isLoadingStats ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                <>
                  {stats?.filteredUniqueCountries ?? '-'}
                  {stats &&
                    stats.filteredUniqueCountries !== stats.uniqueCountries && (
                      <span className="text-sm text-gray-400 font-normal ml-1">
                        / {stats.uniqueCountries}
                      </span>
                    )}
                </>
              )}
            </p>
          </div>
        </div>

        {eventsError && (
          <div className="p-4 border border-red-200 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
            {eventsError}
          </div>
        )}

        <div className="border rounded-lg bg-white dark:bg-gray-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800 border-b">
                <tr>
                  <th className="text-left p-3 font-medium">Timestamp</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Device ID</th>
                  <th className="text-left p-3 font-medium">Location</th>
                  <th className="text-left p-3 font-medium">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {isLoadingEvents ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center">
                      <Loader2 className="size-6 animate-spin mx-auto text-gray-400" />
                    </td>
                  </tr>
                ) : (
                  <>
                    {events.map((event, idx) => (
                      <tr
                        key={`${event.timestamp}-${event.deviceId}-${idx}`}
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                        onClick={() => setSelectedEvent(event)}
                      >
                        <td className="p-3 whitespace-nowrap font-mono text-xs">
                          {new Date(event.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                            {event.type}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs text-gray-500">
                          {event.deviceId.slice(0, 8)}...
                        </td>
                        <td className="p-3 text-xs text-gray-500">
                          {event.country
                            ? `${event.country}${event.region ? ` / ${event.region}` : ''}`
                            : '-'}
                        </td>
                        <td className="p-3 max-w-xs truncate text-gray-500 text-xs">
                          {event.metadata
                            ? JSON.stringify(event.metadata).slice(0, 50) +
                              (JSON.stringify(event.metadata).length > 50
                                ? '...'
                                : '')
                            : '-'}
                        </td>
                      </tr>
                    ))}
                    {events.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center text-gray-500"
                        >
                          No events found
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>

          {hasMore && (
            <div ref={loadMoreRef} className="p-4 flex justify-center border-t">
              {isLoadingMore ? (
                <Loader2 className="size-5 animate-spin text-gray-400" />
              ) : (
                <Button variant="ghost" size="sm" onClick={loadMore}>
                  Load more
                </Button>
              )}
            </div>
          )}
        </div>

        {selectedEvent && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedEvent(null)}
          >
            <div
              className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold">Event Details</h2>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  &times;
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <Label className="text-gray-500">Type</Label>
                  <p className="font-mono">{selectedEvent.type}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Timestamp</Label>
                  <p className="font-mono">
                    {new Date(selectedEvent.timestamp).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Device ID</Label>
                  <p className="font-mono text-sm break-all">
                    {selectedEvent.deviceId}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Location</Label>
                  <p className="font-mono">
                    {selectedEvent.country
                      ? `${selectedEvent.country}${selectedEvent.region ? ` / ${selectedEvent.region}` : ''}`
                      : 'Unknown'}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-500">Metadata</Label>
                  <pre className="mt-1 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-auto">
                    {JSON.stringify(selectedEvent.metadata, null, 2) || 'null'}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
