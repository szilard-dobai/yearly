'use client'

import AdminLoginForm from '@/components/admin/AdminLoginForm'
import AdminNav from '@/components/admin/AdminNav'
import AnalyticsOverviewDialog, {
  type HighLevelStats,
} from '@/components/admin/AnalyticsOverviewDialog'
import DeviceTypeIcon from '@/components/admin/DeviceTypeIcon'
import EventDetailsDialog from '@/components/admin/EventDetailsDialog'
import EventTypeBadge, { EventToneDot } from '@/components/admin/EventTypeBadge'
import StatTile from '@/components/admin/StatTile'
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
import {
  formatDateTime,
  formatLocation,
  getCountryName,
  getEventLabel,
  shortDeviceId,
  summarizeMetadata,
} from '@/lib/admin/format'
import { getFlagEmoji } from '@/lib/countries'
import { useAdminAuth } from '@/lib/hooks/useAdminAuth'
import {
  TRACKING_EVENT_TYPES,
  type StoredTrackingEvent,
} from '@/lib/tracking/types'
import { cn } from '@/lib/utils'
import { BarChart3, Loader2, LogOut, RefreshCw, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

type SortField = 'timestamp' | 'type' | 'deviceId'
type SortOrder = 'asc' | 'desc'

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

const CARD_CLASSES =
  'rounded-xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#141414]'

function statValue(isLoading: boolean, value?: number) {
  if (isLoading)
    return <Loader2 className="size-5 animate-spin text-gray-400" />
  return value === undefined ? '—' : value.toLocaleString()
}

function statHint(isLoading: boolean, value?: number, total?: number) {
  if (isLoading || value === undefined || total === undefined) return undefined
  return value === total ? undefined : `of ${total.toLocaleString()} total`
}

export default function AnalyticsPage() {
  const {
    status: authStatus,
    isAuthenticated,
    login,
    logout,
    markUnauthenticated,
  } = useAdminAuth()

  const [events, setEvents] = useState<StoredTrackingEvent[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [isLoadingEvents, setIsLoadingEvents] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [eventsError, setEventsError] = useState('')
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [deviceIdFilter, setDeviceIdFilter] = useState(() =>
    typeof window === 'undefined'
      ? ''
      : (new URLSearchParams(window.location.search).get('deviceId') ?? '')
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [countryFilter, setCountryFilter] = useState<string>('all')
  const [regionFilter, setRegionFilter] = useState<string>('all')

  const [sortField, setSortField] = useState<SortField>('timestamp')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  const [selectedEvent, setSelectedEvent] =
    useState<StoredTrackingEvent | null>(null)
  const [isEventOpen, setIsEventOpen] = useState(false)

  const [showHighLevelStats, setShowHighLevelStats] = useState(false)
  const [highLevelStats, setHighLevelStats] = useState<HighLevelStats | null>(
    null
  )
  const [isLoadingHighLevelStats, setIsLoadingHighLevelStats] = useState(false)

  const loadMoreRef = useRef<HTMLDivElement>(null)

  const buildFilterParams = useCallback(() => {
    const params = new URLSearchParams()
    if (typeFilter !== 'all') params.set('type', typeFilter)
    if (deviceIdFilter) params.set('deviceId', deviceIdFilter)
    if (searchQuery) params.set('search', searchQuery)
    if (countryFilter !== 'all') params.set('country', countryFilter)
    if (regionFilter !== 'all') params.set('region', regionFilter)
    return params
  }, [typeFilter, deviceIdFilter, searchQuery, countryFilter, regionFilter])

  const buildQueryParams = useCallback(
    (extraParams?: Record<string, string>) => {
      const params = buildFilterParams()
      params.set('sortField', sortField)
      params.set('sortOrder', sortOrder)
      if (extraParams) {
        Object.entries(extraParams).forEach(([key, value]) => {
          params.set(key, value)
        })
      }
      return params.toString()
    },
    [buildFilterParams, sortField, sortOrder]
  )

  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true)
    try {
      const response = await fetch(
        `/api/tracking/stats?${buildFilterParams().toString()}`
      )
      if (!response.ok) {
        if (response.status === 401) {
          markUnauthenticated()
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
  }, [buildFilterParams, markUnauthenticated])

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
            markUnauthenticated()
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
    [buildQueryParams, offset, markUnauthenticated]
  )

  const loadMore = useCallback(() => {
    if (!isLoadingMore && hasMore) {
      fetchEvents(false)
    }
  }, [fetchEvents, hasMore, isLoadingMore])

  const filterDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const sortDebounceRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch stats and events when filters change
  useEffect(() => {
    if (!isAuthenticated) return

    if (filterDebounceRef.current) {
      clearTimeout(filterDebounceRef.current)
    }

    filterDebounceRef.current = setTimeout(() => {
      fetchStats()
      fetchEvents(true)
    }, 300)

    return () => {
      if (filterDebounceRef.current) {
        clearTimeout(filterDebounceRef.current)
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
  ])

  // Only fetch events when sort changes (not stats)
  useEffect(() => {
    if (!isAuthenticated) return

    if (sortDebounceRef.current) {
      clearTimeout(sortDebounceRef.current)
    }

    sortDebounceRef.current = setTimeout(() => {
      fetchEvents(true)
    }, 300)

    return () => {
      if (sortDebounceRef.current) {
        clearTimeout(sortDebounceRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortField, sortOrder])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          hasMore &&
          !isLoadingMore &&
          !isLoadingEvents
        ) {
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

  const handleLogout = async () => {
    await logout()
    setEvents([])
    setStats(null)
  }

  const handleRefresh = () => {
    fetchStats()
    fetchEvents(true)
  }

  const fetchHighLevelStats = async () => {
    setIsLoadingHighLevelStats(true)
    try {
      const response = await fetch('/api/tracking/stats/high-level')
      if (!response.ok) {
        if (response.status === 401) {
          markUnauthenticated()
          return
        }
        throw new Error('Failed to fetch high-level stats')
      }
      const data = await response.json()
      setHighLevelStats(data)
    } catch (error) {
      console.error('Failed to fetch high-level stats:', error)
    } finally {
      setIsLoadingHighLevelStats(false)
    }
  }

  const handleOpenHighLevelStats = () => {
    setShowHighLevelStats(true)
    fetchHighLevelStats()
  }

  const handleSelectEvent = (event: StoredTrackingEvent) => {
    setSelectedEvent(event)
    setIsEventOpen(true)
  }

  const handleShowDeviceEvents = (deviceId: string) => {
    setDeviceIdFilter(deviceId)
    setIsEventOpen(false)
  }

  const sortedCountries = useMemo(
    () =>
      [...(stats?.countries ?? [])].sort((a, b) =>
        getCountryName(a).localeCompare(getCountryName(b))
      ),
    [stats?.countries]
  )

  if (authStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AdminLoginForm onLogin={login} />
  }

  const isRefreshing = isLoadingStats || isLoadingEvents

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">Analytics Dashboard</h1>
            <AdminNav />
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenHighLevelStats}
            >
              <BarChart3 className="size-4" />
              <span className="hidden sm:inline">Overview</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn('size-4', isRefreshing && 'animate-spin')}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        <div
          className={cn(
            'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 p-4',
            CARD_CLASSES
          )}
        >
          <div className="space-y-2">
            <Label>Event type</Label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {TRACKING_EVENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    <EventToneDot type={type} />
                    {getEventLabel(type)}
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
                {sortedCountries.map((country) => (
                  <SelectItem key={country} value={country}>
                    {`${getFlagEmoji(country)} ${getCountryName(country)}`}
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
            <Label htmlFor="analytics-device-id">Device ID</Label>
            <Input
              id="analytics-device-id"
              className="w-full"
              placeholder="Filter by device ID..."
              value={deviceIdFilter}
              onChange={(e) => setDeviceIdFilter(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="analytics-search">Search metadata</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                id="analytics-search"
                placeholder="Search in metadata..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Sort by</Label>
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
          <StatTile
            label="Total events"
            value={statValue(isLoadingStats, stats?.total)}
          />
          <StatTile
            label="Matching filters"
            value={statValue(isLoadingStats, stats?.filtered)}
          />
          <StatTile
            label="Unique devices"
            value={statValue(isLoadingStats, stats?.filteredUniqueDevices)}
            hint={statHint(
              isLoadingStats,
              stats?.filteredUniqueDevices,
              stats?.uniqueDevices
            )}
          />
          <StatTile
            label="Event types"
            value={statValue(isLoadingStats, stats?.filteredEventTypes)}
            hint={statHint(
              isLoadingStats,
              stats?.filteredEventTypes,
              stats?.eventTypes
            )}
          />
          <StatTile
            label="Countries"
            value={statValue(isLoadingStats, stats?.filteredUniqueCountries)}
            hint={statHint(
              isLoadingStats,
              stats?.filteredUniqueCountries,
              stats?.uniqueCountries
            )}
          />
        </div>

        {eventsError && (
          <div className="p-4 border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10 rounded-lg text-red-600 dark:text-red-400">
            {eventsError}
          </div>
        )}

        <div className={cn('overflow-hidden', CARD_CLASSES)}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-[#1a1a1a] text-gray-500 dark:text-zinc-400">
                <tr>
                  <th className="text-left p-3 font-medium">Time</th>
                  <th className="text-left p-3 font-medium">Event</th>
                  <th className="text-left p-3 font-medium">Device</th>
                  <th className="text-left p-3 font-medium">Device ID</th>
                  <th className="text-left p-3 font-medium">Location</th>
                  <th className="text-left p-3 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/8">
                {isLoadingEvents ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center">
                      <Loader2 className="size-6 animate-spin mx-auto text-gray-400" />
                    </td>
                  </tr>
                ) : (
                  <>
                    {events.map((event) => {
                      const details = summarizeMetadata(event.metadata)
                      return (
                        <tr
                          key={event._id}
                          tabIndex={0}
                          aria-label={`${getEventLabel(event.type)}, ${formatDateTime(event.timestamp)}`}
                          className="cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-[#1a1a1a] focus-visible:bg-gray-50 focus-visible:outline-none dark:focus-visible:bg-[#1a1a1a]"
                          onClick={() => handleSelectEvent(event)}
                          onKeyDown={(keyEvent) => {
                            if (
                              keyEvent.key === 'Enter' ||
                              keyEvent.key === ' '
                            ) {
                              keyEvent.preventDefault()
                              handleSelectEvent(event)
                            }
                          }}
                        >
                          <td className="p-3 whitespace-nowrap text-xs text-gray-500 dark:text-zinc-400 tabular-nums">
                            {formatDateTime(event.timestamp, 'seconds')}
                          </td>
                          <td className="p-3">
                            <EventTypeBadge type={event.type} />
                          </td>
                          <td className="p-3 text-xs text-gray-600 dark:text-zinc-400">
                            <span className="flex items-center gap-1.5">
                              <DeviceTypeIcon type={event.deviceType} />
                              {event.deviceType ?? '—'}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-xs text-gray-500 dark:text-zinc-500">
                            {shortDeviceId(event.deviceId)}
                          </td>
                          <td
                            className="p-3 whitespace-nowrap text-xs text-gray-600 dark:text-zinc-400"
                            title={
                              event.country
                                ? getCountryName(event.country)
                                : undefined
                            }
                          >
                            {formatLocation(event.country, event.region, '—')}
                          </td>
                          <td className="p-3 text-xs text-gray-500 dark:text-zinc-500">
                            <div
                              className="max-w-xs xl:max-w-sm truncate"
                              title={details}
                            >
                              {details || '—'}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                    {events.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-8 text-center text-gray-500 dark:text-zinc-400"
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
            <div
              ref={loadMoreRef}
              className="p-4 flex justify-center border-t border-gray-200 dark:border-white/8"
            >
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
      </div>

      <EventDetailsDialog
        event={selectedEvent}
        open={isEventOpen}
        onOpenChange={setIsEventOpen}
        isDeviceFiltered={deviceIdFilter === selectedEvent?.deviceId}
        onShowDeviceEvents={handleShowDeviceEvents}
      />

      <AnalyticsOverviewDialog
        open={showHighLevelStats}
        onOpenChange={setShowHighLevelStats}
        stats={highLevelStats}
        isLoading={isLoadingHighLevelStats}
      />
    </div>
  )
}
