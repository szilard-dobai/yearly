'use client'

import AdminLoginForm from '@/components/admin/AdminLoginForm'
import AdminNav from '@/components/admin/AdminNav'
import CountryFlag from '@/components/admin/CountryFlag'
import DeviceActivityDialog from '@/components/admin/DeviceActivityDialog'
import DeviceTypeIcon from '@/components/admin/DeviceTypeIcon'
import StatTile from '@/components/admin/StatTile'
import StarRating from '@/components/StarRating'
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
import { Switch } from '@/components/ui/switch'
import { deleteDeviceActivity, deleteFeedbackEntry } from '@/lib/admin/client'
import {
  formatDateTime,
  formatLocation,
  formatRelativeTime,
  shortDeviceId,
} from '@/lib/admin/format'
import {
  FEEDBACK_RATINGS,
  FEEDBACK_SOURCE_LABELS,
  FEEDBACK_SOURCES,
  type FeedbackEntry,
  type FeedbackSortField,
  type FeedbackStats,
} from '@/lib/feedback/types'
import { useAdminAuth } from '@/lib/hooks/useAdminAuth'
import { cn } from '@/lib/utils'
import {
  ChevronRight,
  Loader2,
  LogOut,
  RefreshCw,
  Search,
  Star,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const PAGE_SIZE = 30

const SORT_OPTIONS = {
  newest: { label: 'Newest first', field: 'createdAt', order: 'desc' },
  oldest: { label: 'Oldest first', field: 'createdAt', order: 'asc' },
  highest: { label: 'Highest rating', field: 'rating', order: 'desc' },
  lowest: { label: 'Lowest rating', field: 'rating', order: 'asc' },
} as const satisfies Record<
  string,
  { label: string; field: FeedbackSortField; order: 'asc' | 'desc' }
>

type SortOption = keyof typeof SORT_OPTIONS
type RatingFilter = 'all' | 'none' | `${(typeof FEEDBACK_RATINGS)[number]}`
type SourceFilter = 'all' | (typeof FEEDBACK_SOURCES)[number]

function RatingDistribution({
  stats,
  activeRating,
  onSelect,
}: {
  stats: FeedbackStats
  activeRating: RatingFilter
  onSelect: (rating: RatingFilter) => void
}) {
  const max = Math.max(...Object.values(stats.distribution), 1)

  return (
    <div className="rounded-xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#141414] p-4">
      <p className="text-sm text-gray-500 dark:text-zinc-400 mb-3">
        Rating distribution
      </p>
      <div className="space-y-1">
        {[...FEEDBACK_RATINGS].reverse().map((rating) => {
          const count = stats.distribution[rating]
          const isActive = activeRating === String(rating)
          const share = stats.ratedCount
            ? Math.round((count / stats.ratedCount) * 100)
            : 0
          return (
            <button
              key={rating}
              type="button"
              onClick={() => onSelect(isActive ? 'all' : `${rating}`)}
              aria-pressed={isActive}
              className={cn(
                'w-full flex items-center gap-3 rounded-md px-2 py-1 text-sm cursor-pointer transition-colors',
                isActive
                  ? 'bg-amber-50 dark:bg-amber-500/10'
                  : 'hover:bg-gray-50 dark:hover:bg-[#1a1a1a]'
              )}
            >
              <span className="flex w-8 items-center gap-0.5 font-medium text-gray-700 dark:text-zinc-300 tabular-nums">
                {rating}
                <Star className="size-3 fill-amber-400 text-amber-400" />
              </span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/8">
                <span
                  className="block h-full rounded-full bg-amber-400"
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </span>
              <span className="w-16 text-right text-gray-500 dark:text-zinc-400 tabular-nums">
                {count}{' '}
                <span className="text-xs text-gray-400 dark:text-zinc-500">
                  ({share}%)
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FeedbackListItem({
  entry,
  now,
  onSelect,
}: {
  entry: FeedbackEntry
  now: number
  onSelect: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className="group w-full text-left rounded-xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#141414] p-4 cursor-pointer transition-colors hover:border-gray-300 hover:bg-gray-50/60 dark:hover:bg-[#1a1a1a] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {entry.rating ? (
            <StarRating value={entry.rating} size="base" />
          ) : (
            <span className="rounded-full bg-gray-100 dark:bg-white/8 px-2 py-0.5 text-xs text-gray-500 dark:text-zinc-400">
              No rating
            </span>
          )}
          <span className="rounded-full bg-gray-100 dark:bg-white/8 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-zinc-300">
            {FEEDBACK_SOURCE_LABELS[entry.source]}
            {entry.context?.exportType && ` · ${entry.context.exportType}`}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-zinc-400">
            <DeviceTypeIcon type={entry.deviceType} />
            {entry.country && (
              <span
                className="flex items-center gap-1"
                title={formatLocation(entry.country, entry.region)}
              >
                <CountryFlag code={entry.country} />
                {entry.country}
              </span>
            )}
          </span>
          <time
            dateTime={entry.createdAt}
            title={formatDateTime(entry.createdAt)}
            className="ml-auto text-xs text-gray-500 dark:text-zinc-500"
          >
            {formatRelativeTime(entry.createdAt, now)}
          </time>
        </div>

        {entry.message ? (
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-800 dark:text-zinc-200 line-clamp-4">
            {entry.message}
          </p>
        ) : (
          <p className="mt-3 text-sm italic text-gray-400 dark:text-zinc-500">
            Rating only, no message
          </p>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-gray-500 dark:text-zinc-500">
          <span className="font-mono">
            Device {shortDeviceId(entry.deviceId)}
          </span>
          <span className="flex items-center gap-0.5 font-medium text-gray-700 group-hover:text-gray-900 dark:text-zinc-300 dark:group-hover:text-zinc-100">
            View activity
            <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </button>
    </li>
  )
}

function FeedbackDashboard({
  onLogout,
  onUnauthorized,
}: {
  onLogout: () => void
  onUnauthorized: () => void
}) {
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [withCommentsOnly, setWithCommentsOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sort, setSort] = useState<SortOption>('newest')

  const [feedback, setFeedback] = useState<FeedbackEntry[]>([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(0)

  const [stats, setStats] = useState<FeedbackStats | null>(null)
  const [isLoadingStats, setIsLoadingStats] = useState(true)

  const [selected, setSelected] = useState<FeedbackEntry | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const requestIdRef = useRef(0)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (ratingFilter !== 'all') params.set('rating', ratingFilter)
    if (sourceFilter !== 'all') params.set('source', sourceFilter)
    if (withCommentsOnly) params.set('hasMessage', 'true')
    if (searchQuery.trim()) params.set('search', searchQuery.trim())
    params.set('sortField', SORT_OPTIONS[sort].field)
    params.set('sortOrder', SORT_OPTIONS[sort].order)
    params.set('limit', String(PAGE_SIZE))
    return params.toString()
  }, [ratingFilter, sourceFilter, withCommentsOnly, searchQuery, sort])

  const loadPage = useCallback(
    async (offset: number) => {
      const requestId = ++requestIdRef.current
      if (offset === 0) {
        setIsLoading(true)
      } else {
        setIsLoadingMore(true)
      }
      setError('')

      try {
        const response = await fetch(
          `/api/feedback?${queryString}&offset=${offset}`
        )
        if (response.status === 401) {
          onUnauthorized()
          return
        }
        if (!response.ok) throw new Error('Failed to load feedback')

        const data: {
          feedback: FeedbackEntry[]
          total: number
          hasMore: boolean
        } = await response.json()
        if (requestId !== requestIdRef.current) return

        setFeedback((previous) =>
          offset === 0 ? data.feedback : [...previous, ...data.feedback]
        )
        setTotal(data.total)
        setHasMore(data.hasMore)
        setNow(Date.now())
      } catch (loadError) {
        if (requestId === requestIdRef.current) {
          setError(
            loadError instanceof Error ? loadError.message : 'Unknown error'
          )
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false)
          setIsLoadingMore(false)
        }
      }
    },
    [queryString, onUnauthorized]
  )

  const loadStats = useCallback(async () => {
    setIsLoadingStats(true)
    try {
      const response = await fetch('/api/feedback/stats')
      if (response.status === 401) {
        onUnauthorized()
        return
      }
      if (response.ok) setStats(await response.json())
    } finally {
      setIsLoadingStats(false)
    }
  }, [onUnauthorized])

  useEffect(() => {
    const timeout = setTimeout(() => loadPage(0), 250)
    return () => clearTimeout(timeout)
  }, [loadPage])

  useEffect(() => {
    const timeout = setTimeout(loadStats, 0)
    return () => clearTimeout(timeout)
  }, [loadStats])

  const loadMore = useCallback(() => {
    if (!isLoadingMore && !isLoading && hasMore) {
      loadPage(feedback.length)
    }
  }, [feedback.length, hasMore, isLoading, isLoadingMore, loadPage])

  useEffect(() => {
    const target = loadMoreRef.current
    if (!target) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { threshold: 0.1 }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [loadMore])

  const handleRefresh = () => {
    loadStats()
    loadPage(0)
  }

  const handleSelect = (entry: FeedbackEntry) => {
    setSelected(entry)
    setIsDetailOpen(true)
  }

  const handleDeleteFeedback = async (entry: FeedbackEntry) => {
    await deleteFeedbackEntry(entry._id, onUnauthorized)
    setIsDetailOpen(false)
    setFeedback((previous) => previous.filter((item) => item._id !== entry._id))
    setTotal((previous) => Math.max(previous - 1, 0))
    loadStats()
  }

  const handleDeleteDevice = async (deviceId: string) => {
    await deleteDeviceActivity(deviceId, onUnauthorized)
    setIsDetailOpen(false)
    handleRefresh()
  }

  const hasActiveFilters =
    ratingFilter !== 'all' ||
    sourceFilter !== 'all' ||
    withCommentsOnly ||
    searchQuery.trim().length > 0

  const resetFilters = () => {
    setRatingFilter('all')
    setSourceFilter('all')
    setWithCommentsOnly(false)
    setSearchQuery('')
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">Feedback</h1>
            <AdminNav />
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || isLoadingStats}
            >
              <RefreshCw
                className={cn(
                  'size-4',
                  (isLoading || isLoadingStats) && 'animate-spin'
                )}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="grid grid-cols-2 gap-4">
            <StatTile
              label="Total feedback"
              value={stats ? stats.total.toLocaleString() : '—'}
            />
            <StatTile
              label="Average rating"
              value={
                stats?.averageRating != null ? (
                  <span className="flex items-center gap-1.5">
                    {stats.averageRating.toFixed(1)}
                    <Star className="size-5 fill-amber-400 text-amber-400" />
                  </span>
                ) : (
                  '—'
                )
              }
              hint={stats ? `from ${stats.ratedCount} ratings` : undefined}
            />
            <StatTile
              label="With comments"
              value={stats ? stats.withMessage.toLocaleString() : '—'}
            />
            <StatTile
              label="Last 7 days"
              value={stats ? stats.lastSevenDays.toLocaleString() : '—'}
            />
          </div>
          {stats ? (
            <RatingDistribution
              stats={stats}
              activeRating={ratingFilter}
              onSelect={setRatingFilter}
            />
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#141414] p-4">
              <Loader2 className="size-5 animate-spin text-gray-400" />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.4fr] gap-4 rounded-xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#141414] p-4">
          <div className="space-y-2">
            <Label>Rating</Label>
            <Select
              value={ratingFilter}
              onValueChange={(value) => setRatingFilter(value as RatingFilter)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ratings</SelectItem>
                {[...FEEDBACK_RATINGS].reverse().map((rating) => (
                  <SelectItem key={rating} value={String(rating)}>
                    <span>
                      <span className="text-amber-400">
                        {'★'.repeat(rating)}
                      </span>
                      <span className="text-gray-300 dark:text-zinc-600">
                        {'★'.repeat(5 - rating)}
                      </span>
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value="none">No rating</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Source</Label>
            <Select
              value={sourceFilter}
              onValueChange={(value) => setSourceFilter(value as SourceFilter)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {FEEDBACK_SOURCES.map((source) => (
                  <SelectItem key={source} value={source}>
                    {FEEDBACK_SOURCE_LABELS[source]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Sort by</Label>
            <Select
              value={sort}
              onValueChange={(value) => setSort(value as SortOption)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SORT_OPTIONS).map(([value, option]) => (
                  <SelectItem key={value} value={value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-search">Search messages</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
              <Input
                id="feedback-search"
                placeholder="Search feedback..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-8 w-full"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-2 lg:col-span-4">
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300 cursor-pointer">
              <Switch
                checked={withCommentsOnly}
                onCheckedChange={setWithCommentsOnly}
                aria-label="Only show feedback with comments"
              />
              Only with comments
            </label>
            <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-zinc-400">
              <span>
                {isLoading
                  ? 'Loading...'
                  : `Showing ${feedback.length} of ${total.toLocaleString()}`}
              </span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="size-6 animate-spin text-gray-400" />
          </div>
        ) : feedback.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 dark:border-white/8 py-16 text-center">
            <p className="text-gray-600 dark:text-zinc-400">
              {hasActiveFilters
                ? 'No feedback matches these filters.'
                : 'No feedback yet.'}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {feedback.map((entry) => (
              <FeedbackListItem
                key={entry._id}
                entry={entry}
                now={now}
                onSelect={() => handleSelect(entry)}
              />
            ))}
          </ul>
        )}

        {hasMore && !isLoading && (
          <div ref={loadMoreRef} className="flex justify-center py-2">
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

      <DeviceActivityDialog
        feedback={selected}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onUnauthorized={onUnauthorized}
        onDeleteFeedback={handleDeleteFeedback}
        onDeleteDevice={handleDeleteDevice}
      />
    </div>
  )
}

export default function FeedbackAdminPage() {
  const { status, login, logout, markUnauthenticated } = useAdminAuth()

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <AdminLoginForm onLogin={login} />
  }

  return (
    <FeedbackDashboard onLogout={logout} onUnauthorized={markUnauthenticated} />
  )
}
