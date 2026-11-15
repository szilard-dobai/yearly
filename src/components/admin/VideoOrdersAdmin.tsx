'use client'

import AdminLoginForm from '@/components/admin/AdminLoginForm'
import AdminNav from '@/components/admin/AdminNav'
import CopyButton from '@/components/admin/CopyButton'
import DetailRow from '@/components/admin/DetailRow'
import RenderAgainButton from '@/components/admin/RenderAgainButton'
import StatTile from '@/components/admin/StatTile'
import { Button } from '@/components/ui/button'
import { renderVideoOrderAgain } from '@/lib/admin/client'
import {
  formatDateTime,
  formatMoney,
  formatVideoPack,
} from '@/lib/admin/format'
import type {
  VideoOrderSource,
  VideoOrderStatus,
  VideoRenderStatus,
} from '@/lib/db/schema'
import { useAdminAuth } from '@/lib/hooks/useAdminAuth'
import { cn } from '@/lib/utils'
import type { AdminVideoOrder, AdminVideoTotals } from '@/lib/videos/admin'
import { MAX_UPDATES } from '@/lib/videos/period'
import { ExternalLink, Loader2, LogOut, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

const CARD_CLASSES =
  'rounded-xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#141414]'

const BADGE_TONES = {
  good: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  busy: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  warn: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  bad: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300',
  muted: 'bg-gray-100 text-gray-700 dark:bg-white/8 dark:text-zinc-300',
} as const

type BadgeTone = keyof typeof BADGE_TONES

const ORDER_STATUS: Record<VideoOrderStatus, [string, BadgeTone]> = {
  paid: ['Paid', 'good'],
  refunded: ['Refunded', 'warn'],
  draft: ['Unpaid', 'muted'],
}

const RENDER_STATUS: Record<VideoRenderStatus, [string, BadgeTone]> = {
  ready: ['Ready', 'good'],
  rendering: ['Rendering', 'busy'],
  queued: ['Queued', 'muted'],
  failed: ['Failed', 'bad'],
}

const SOURCE_LABELS: Record<VideoOrderSource, string> = {
  polar: 'Polar',
  credit: 'Free credit',
}

type OrdersResponse = {
  orders: AdminVideoOrder[]
  hasMore: boolean
  totals: AdminVideoTotals | null
}

function StatusBadge({ label, tone }: { label: string; tone: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        BADGE_TONES[tone]
      )}
    >
      {label}
    </span>
  )
}

function OrderStatusBadge({ status }: { status: VideoOrderStatus }) {
  const [label, tone] = ORDER_STATUS[status]
  return <StatusBadge label={label} tone={tone} />
}

function amountOf(order: AdminVideoOrder) {
  return order.amountCents !== null && order.currency
    ? formatMoney(order.amountCents, order.currency)
    : '—'
}

function PackLabel({ order }: { order: AdminVideoOrder }) {
  return (
    <span className="font-medium whitespace-nowrap text-gray-900 dark:text-zinc-100">
      {formatVideoPack(order)}
    </span>
  )
}

function RenderSummary({ order }: { order: AdminVideoOrder }) {
  const { render } = order
  if (!render) {
    return (
      <span className="text-xs text-gray-500 dark:text-zinc-500">
        {order.status === 'refunded' ? 'Deleted at refund' : '—'}
      </span>
    )
  }

  const [label, tone] = RENDER_STATUS[render.status]
  return (
    <div className="min-w-0 space-y-1">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-gray-500 dark:text-zinc-500">
          v{render.version}
        </span>
        <StatusBadge label={label} tone={tone} />
        {render.finishedAt && (
          <time
            dateTime={render.finishedAt}
            className="text-xs whitespace-nowrap text-gray-500 dark:text-zinc-500"
          >
            {formatDateTime(render.finishedAt)}
          </time>
        )}
      </div>
      {render.error && (
        <div className="flex items-start gap-1">
          <p className="min-w-0 flex-1 font-mono text-xs break-words text-red-600 line-clamp-3 dark:text-red-400">
            {render.error}
          </p>
          <CopyButton value={render.error} label="Copy the error" />
        </div>
      )}
    </div>
  )
}

function RenderAgain({
  order,
  onRenderAgain,
}: {
  order: AdminVideoOrder
  onRenderAgain: (order: AdminVideoOrder) => Promise<void>
}) {
  if (order.status !== 'paid' || order.render?.status !== 'failed') {
    return null
  }
  return (
    <RenderAgainButton
      version={order.render.version}
      onConfirm={() => onRenderAgain(order)}
    />
  )
}

function PolarOrderLink({ url }: { url: string }) {
  return (
    <Button variant="outline" size="sm" asChild>
      <a href={url} target="_blank" rel="noreferrer">
        Polar order
        <ExternalLink className="size-3.5" />
      </a>
    </Button>
  )
}

function Payment({ order }: { order: AdminVideoOrder }) {
  return (
    <div className="space-y-0.5 whitespace-nowrap">
      <div className="tabular-nums text-gray-900 dark:text-zinc-100">
        {amountOf(order)}
      </div>
      {order.polarOrderUrl ? (
        <a
          href={order.polarOrderUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Polar order
          <ExternalLink className="size-3" />
        </a>
      ) : (
        <div className="text-xs text-gray-500 dark:text-zinc-500">
          {SOURCE_LABELS[order.source]}
        </div>
      )}
    </div>
  )
}

function OrdersTable({
  orders,
  onRenderAgain,
}: {
  orders: AdminVideoOrder[]
  onRenderAgain: (order: AdminVideoOrder) => Promise<void>
}) {
  return (
    <div className="hidden overflow-x-auto md:block">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-[#1a1a1a] text-gray-500 dark:text-zinc-400">
          <tr>
            <th className="text-left p-3 font-medium">Created</th>
            <th className="text-left p-3 font-medium">Buyer</th>
            <th className="text-left p-3 font-medium">Pack</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-left p-3 font-medium">Payment</th>
            <th className="text-left p-3 font-medium">Latest render</th>
            <th className="text-right p-3 font-medium">Updates</th>
            <th className="p-3">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-white/8">
          {orders.map((order) => (
            <tr key={order.id} className="align-top">
              <td className="p-3 whitespace-nowrap text-xs text-gray-500 dark:text-zinc-400 tabular-nums">
                <time dateTime={order.createdAt}>
                  {formatDateTime(order.createdAt)}
                </time>
              </td>
              <td className="p-3 text-gray-900 dark:text-zinc-100">
                <div className="max-w-64 break-words">{order.email}</div>
              </td>
              <td className="p-3">
                <PackLabel order={order} />
              </td>
              <td className="p-3">
                <OrderStatusBadge status={order.status} />
              </td>
              <td className="p-3">
                <Payment order={order} />
              </td>
              <td className="p-3">
                <div className="max-w-xs">
                  <RenderSummary order={order} />
                </div>
              </td>
              <td className="p-3 text-right whitespace-nowrap tabular-nums text-gray-600 dark:text-zinc-400">
                {order.updatesUsed} of {MAX_UPDATES}
              </td>
              <td className="p-3 text-right">
                <RenderAgain order={order} onRenderAgain={onRenderAgain} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OrdersList({
  orders,
  onRenderAgain,
}: {
  orders: AdminVideoOrder[]
  onRenderAgain: (order: AdminVideoOrder) => Promise<void>
}) {
  return (
    <ul className="divide-y divide-gray-100 dark:divide-white/8 md:hidden">
      {orders.map((order) => (
        <li key={order.id} className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <OrderStatusBadge status={order.status} />
            <PackLabel order={order} />
            <time
              dateTime={order.createdAt}
              className="ml-auto text-xs text-gray-500 dark:text-zinc-500"
            >
              {formatDateTime(order.createdAt)}
            </time>
          </div>
          <p className="text-sm break-words text-gray-900 dark:text-zinc-100">
            {order.email}
          </p>
          <dl className="grid grid-cols-3 gap-3">
            <DetailRow label="Source" value={SOURCE_LABELS[order.source]} />
            <DetailRow label="Amount" value={amountOf(order)} />
            <DetailRow
              label="Updates"
              value={`${order.updatesUsed} of ${MAX_UPDATES}`}
            />
          </dl>
          <div>
            <p className="mb-1 text-xs text-gray-500 dark:text-zinc-500">
              Latest render
            </p>
            <RenderSummary order={order} />
          </div>
          {(order.polarOrderUrl || order.render?.status === 'failed') && (
            <div className="flex flex-wrap items-center gap-2">
              <RenderAgain order={order} onRenderAgain={onRenderAgain} />
              {order.polarOrderUrl && (
                <PolarOrderLink url={order.polarOrderUrl} />
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}

function Totals({ totals }: { totals: AdminVideoTotals | null }) {
  const count = (value: number | undefined) =>
    value === undefined ? '—' : value.toLocaleString()

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-7">
      <StatTile
        className="col-span-2 sm:col-span-3 xl:col-span-1"
        label="Revenue"
        value={
          !totals ? (
            '—'
          ) : totals.revenue.length === 0 ? (
            formatMoney(0, 'usd')
          ) : (
            <span className="flex flex-wrap gap-x-3">
              {totals.revenue.map((row) => (
                <span key={row.currency}>
                  {formatMoney(row.amountCents, row.currency)}
                </span>
              ))}
            </span>
          )
        }
        hint="Incl. tax, before Polar's fees"
      />
      <StatTile
        label="Paid orders"
        value={count(totals?.paidOrders)}
        hint="Through Polar"
      />
      <StatTile
        label="Free orders"
        value={count(totals?.freeOrders)}
        hint="Waitlist credits"
      />
      <StatTile label="Refunded" value={count(totals?.refundedOrders)} />
      <StatTile
        label="Failed renders"
        value={
          totals?.failedRenders ? (
            <span className="text-red-600 dark:text-red-400">
              {count(totals.failedRenders)}
            </span>
          ) : (
            count(totals?.failedRenders)
          )
        }
        hint="Latest version"
      />
      <StatTile
        label="Rendering now"
        value={count(totals?.activeRenders)}
        hint="Queued or rendering"
      />
      <StatTile
        label="Credits left"
        value={count(totals?.creditsLeft)}
        hint="Unused and unexpired"
      />
    </div>
  )
}

function VideoOrdersDashboard({
  onLogout,
  onUnauthorized,
}: {
  onLogout: () => void
  onUnauthorized: () => void
}) {
  const [orders, setOrders] = useState<AdminVideoOrder[]>([])
  const [totals, setTotals] = useState<AdminVideoTotals | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const requestIdRef = useRef(0)
  const loadMoreRef = useRef<HTMLDivElement>(null)

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
        const response = await fetch(`/api/admin/video-orders?offset=${offset}`)
        if (response.status === 401) {
          onUnauthorized()
          return
        }
        if (!response.ok) throw new Error('Failed to load video orders')

        const data: OrdersResponse = await response.json()
        if (requestId !== requestIdRef.current) return

        setOrders((previous) =>
          offset === 0 ? data.orders : [...previous, ...data.orders]
        )
        if (data.totals) setTotals(data.totals)
        setHasMore(data.hasMore)
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
    [onUnauthorized]
  )

  useEffect(() => {
    const timeout = setTimeout(() => loadPage(0), 0)
    return () => clearTimeout(timeout)
  }, [loadPage])

  const loadMore = useCallback(() => {
    if (!isLoadingMore && !isLoading && hasMore) {
      loadPage(orders.length)
    }
  }, [orders.length, hasMore, isLoading, isLoadingMore, loadPage])

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

  const handleRenderAgain = async (order: AdminVideoOrder) => {
    await renderVideoOrderAgain(order.id, onUnauthorized)
    loadPage(0)
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">Videos</h1>
            <AdminNav />
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadPage(0)}
              disabled={isLoading}
            >
              <RefreshCw
                className={cn('size-4', isLoading && 'animate-spin')}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button variant="outline" size="sm" onClick={onLogout}>
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>

        <Totals totals={totals} />

        {error && (
          <div className="p-4 border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10 rounded-lg text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        <section
          aria-labelledby="video-orders-heading"
          className={cn('overflow-hidden', CARD_CLASSES)}
        >
          <h2 id="video-orders-heading" className="sr-only">
            Orders
          </h2>
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="size-6 animate-spin text-gray-400" />
            </div>
          ) : orders.length === 0 ? (
            <p className="p-8 text-center text-gray-500 dark:text-zinc-400">
              No video orders yet.
            </p>
          ) : (
            <>
              <OrdersTable orders={orders} onRenderAgain={handleRenderAgain} />
              <OrdersList orders={orders} onRenderAgain={handleRenderAgain} />
            </>
          )}

          {hasMore && !isLoading && (
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
        </section>
      </div>
    </div>
  )
}

export default function VideoOrdersAdmin() {
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
    <VideoOrdersDashboard
      onLogout={logout}
      onUnauthorized={markUnauthenticated}
    />
  )
}
