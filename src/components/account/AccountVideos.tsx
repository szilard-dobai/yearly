'use client'

import { CardContent } from '@/components/ui/card'
import { StandardCard } from '@/components/ui/card-variants'
import { fetchVideoAccount, type VideoAccount } from '@/lib/videos/client'
import { Gift } from 'lucide-react'
import Link from 'next/link'
import { type ReactNode, useEffect, useState } from 'react'
import VideoOrderCard from './VideoOrderCard'

type State =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'loaded'; account: VideoAccount }

const linkClassName =
  'font-medium text-gray-900 underline underline-offset-2 dark:text-zinc-100'

function Note({ children }: { children: ReactNode }) {
  return (
    <StandardCard>
      <CardContent className="text-sm text-gray-600 dark:text-zinc-400">
        {children}
      </CardContent>
    </StandardCard>
  )
}

export default function AccountVideos() {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    fetchVideoAccount()
      .then((account) => {
        if (!cancelled) setState({ status: 'loaded', account })
      })
      .catch((error: unknown) => {
        console.error('Failed to load videos:', error)
        if (!cancelled) setState({ status: 'error' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section aria-labelledby="your-videos" className="space-y-3">
      <h2
        id="your-videos"
        className="font-serif text-2xl font-normal text-gray-900 dark:text-zinc-100"
      >
        Your videos
      </h2>

      {state.status === 'loading' && (
        <Note>
          <p role="status">Loading your videos…</p>
        </Note>
      )}

      {state.status === 'error' && (
        <Note>
          <p role="alert">
            We couldn&apos;t load your videos. Try again in a moment.
          </p>
        </Note>
      )}

      {state.status === 'loaded' && state.account.freeVideo && (
        <p className="flex items-start gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-300">
          <Gift className="mt-0.5 size-4 shrink-0" />
          <span>
            Your first video is free. Download an image from your calendar, then
            tap See it animated.{' '}
            <Link
              href="/create"
              className="font-medium underline underline-offset-2"
            >
              Open your calendar
            </Link>
          </span>
        </p>
      )}

      {state.status === 'loaded' &&
        state.account.orders.length === 0 &&
        !state.account.freeVideo && (
          <Note>
            <p>
              No videos yet. Download an image from your calendar, then tap See
              it animated to make one.{' '}
              <Link href="/create" className={linkClassName}>
                Open your calendar
              </Link>
            </p>
          </Note>
        )}

      {state.status === 'loaded' &&
        state.account.orders.map((order) => (
          <StandardCard key={order.id}>
            <CardContent>
              <VideoOrderCard order={order} />
            </CardContent>
          </StandardCard>
        ))}
    </section>
  )
}
