'use client'

import { cn } from '@/lib/utils'
import { formatPrice } from '@/lib/video-offer'
import { formatRate, type WaitlistStats } from '@/lib/waitlist/stats'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'

type Result =
  | { key: number; stats: WaitlistStats; failed: false }
  | { key: number; stats: null; failed: true }

export default function VideoOfferPanel({
  refreshKey,
}: {
  refreshKey: number
}) {
  const [result, setResult] = useState<Result | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/waitlist/stats')
      .then((response) => {
        if (!response.ok) throw new Error(String(response.status))
        return response.json() as Promise<WaitlistStats>
      })
      .then((stats) => {
        if (!cancelled) setResult({ key: refreshKey, stats, failed: false })
      })
      .catch(() => {
        if (!cancelled)
          setResult({ key: refreshKey, stats: null, failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey])

  const stats = result?.stats
  const isRefreshing = !!result && result.key !== refreshKey

  return (
    <section
      aria-labelledby="video-offer-heading"
      aria-busy={!result || isRefreshing}
      className="rounded-xl border border-gray-200 bg-white p-4 dark:border-white/8 dark:bg-[#141414]"
    >
      <h2
        id="video-offer-heading"
        className="text-sm font-medium text-gray-900 dark:text-zinc-100"
      >
        Animated video test
      </h2>
      <p className="mb-4 text-xs text-gray-500 dark:text-zinc-400">
        Unique devices at each step, by the price they were shown
      </p>

      {!result || (result.failed && isRefreshing) ? (
        <Loader2 className="size-5 animate-spin text-gray-400" />
      ) : !stats ? (
        <p className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load the waitlist stats.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-[12rem_1fr]">
          <div>
            <p className="text-sm text-gray-500 dark:text-zinc-400">Waitlist</p>
            <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-zinc-100">
              {isRefreshing ? (
                <Loader2 className="size-5 animate-spin text-gray-400" />
              ) : (
                stats.total.toLocaleString()
              )}
            </div>
            {!isRefreshing && (
              <p className="mt-0.5 text-xs text-gray-400 dark:text-zinc-500">
                {stats.lastSevenDays.toLocaleString()} in the last 7 days
              </p>
            )}
          </div>

          {stats.funnel.length === 0 ? (
            <p
              className={cn(
                'self-center text-sm text-gray-500 transition-opacity dark:text-zinc-400',
                isRefreshing && 'opacity-40'
              )}
            >
              No one has opened the video preview yet.
            </p>
          ) : (
            <div
              className={cn(
                'overflow-x-auto transition-opacity',
                isRefreshing && 'opacity-40'
              )}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 dark:text-zinc-400">
                    <th className="pb-2 font-medium">Price</th>
                    <th className="pb-2 text-right font-medium">Previewed</th>
                    <th className="pb-2 text-right font-medium">Clicked buy</th>
                    <th className="pb-2 text-right font-medium">Joined</th>
                    <th className="pb-2 text-right font-medium">Buy rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/8">
                  {stats.funnel.map((row) => (
                    <tr
                      key={row.price}
                      className="text-gray-900 tabular-nums dark:text-zinc-100"
                    >
                      <td className="py-2 font-medium">
                        {formatPrice(row.price)}
                      </td>
                      <td className="py-2 text-right">{row.previews}</td>
                      <td className="py-2 text-right">{row.buyClicks}</td>
                      <td className="py-2 text-right">{row.signups}</td>
                      <td className="py-2 text-right">
                        {formatRate(row.buyClicks, row.previews)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
