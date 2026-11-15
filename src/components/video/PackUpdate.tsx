'use client'

import { Button } from '@/components/ui/button'
import type { CalendarDays } from '@/lib/calendar-sync/days'
import { useSettings } from '@/lib/contexts/SettingsContext'
import { trackEvent } from '@/lib/tracking'
import {
  isOrderWorking,
  orderPeriodLabel,
  type OrderSummary,
  requestVideoUpdate,
  type UpdateRefusal,
} from '@/lib/videos/client'
import { MAX_UPDATES } from '@/lib/videos/period'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export type PackCalendarState = 'loading' | 'saved' | 'error'

interface PackUpdateProps {
  order: OrderSummary
  calendar: PackCalendarState
  readDays: () => CalendarDays
  onStarted: (order: OrderSummary) => void
  onNewPack?: () => void
  source: 'dialog' | 'account'
}

type UpdateState =
  | { step: 'idle' }
  | { step: 'confirm' }
  | { step: 'sending' }
  | { step: 'refused'; reason: UpdateRefusal }

const linkClassName =
  'font-medium text-gray-900 underline underline-offset-2 dark:text-zinc-100'

function refusalMessage(reason: UpdateRefusal, isMonth: boolean) {
  const noun = isMonth ? 'video' : 'videos'
  switch (reason) {
    case 'unchanged':
      return isMonth
        ? 'Your video already includes all your trips. Add a trip to your calendar, then update it.'
        : 'Your videos already include all your trips. Add a trip to your calendar, then update them.'
    case 'busy':
      return `Your ${noun} ${isMonth ? 'is' : 'are'} already being updated. This usually takes under a minute.`
    case 'no-updates-left':
      return `You've used all ${MAX_UPDATES} updates for this pack. To add more trips, get a new pack.`
    case 'too-different':
      return `These trips are too different from your first ${noun}. Updates are for adding trips or fixing a country. For a different calendar, get a new pack.`
    default:
      return `We couldn't update your ${noun}. Try again in a moment.`
  }
}

export default function PackUpdate({
  order,
  calendar,
  readDays,
  onStarted,
  onNewPack,
  source,
}: PackUpdateProps) {
  const { settings } = useSettings()
  const [state, setState] = useState<UpdateState>({ step: 'idle' })
  const isMonth = order.pack === 'month'
  const noun = isMonth ? 'video' : 'videos'
  const working = isOrderWorking(order)
  const left = order.updatesLeft

  const newPack = onNewPack ? (
    <Button size="sm" variant="outline" onClick={onNewPack}>
      Get a new pack
    </Button>
  ) : (
    <Link href="/create" className={linkClassName}>
      Open your calendar
    </Link>
  )

  const send = async () => {
    setState({ step: 'sending' })
    const result = await requestVideoUpdate(
      order,
      readDays(),
      settings.weekStartsOn
    )
    trackEvent('animated_video_update_requested', {
      pack: order.pack,
      result: result.ok ? 'started' : result.reason,
      source,
    })
    if (result.ok) {
      setState({ step: 'idle' })
      onStarted(result.order)
    } else {
      setState({ step: 'refused', reason: result.reason })
    }
  }

  if (left === 0) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600 dark:text-zinc-400">
          {refusalMessage('no-updates-left', isMonth)}
        </p>
        {newPack}
      </div>
    )
  }

  if (state.step === 'confirm' || state.step === 'sending') {
    return (
      <div className="space-y-3 rounded-lg bg-gray-50 p-3 dark:bg-white/5">
        <p className="text-sm text-gray-700 dark:text-zinc-300">
          Remake your {orderPeriodLabel(order)} {noun} from the trips in your
          calendar now? This uses 1 of the {left}{' '}
          {left === 1 ? 'update' : 'updates'} you have left.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={send} disabled={state.step === 'sending'}>
            {state.step === 'sending' && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Update {noun}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setState({ step: 'idle' })}
            disabled={state.step === 'sending'}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  const refusal = state.step === 'refused' ? state.reason : null

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        className="w-full whitespace-normal"
        disabled={working || calendar !== 'saved'}
        onClick={() => setState({ step: 'confirm' })}
      >
        Update with my latest trips ({left} left)
      </Button>
      {calendar === 'loading' && (
        <p className="text-xs text-gray-500 dark:text-zinc-500">
          Checking your saved trips…
        </p>
      )}
      {calendar === 'error' && (
        <p className="text-xs text-gray-500 dark:text-zinc-500">
          We couldn&apos;t reach your saved trips. Try again in a moment.
        </p>
      )}
      {refusal && (
        <div role="alert" className="space-y-3">
          <p className="text-sm text-gray-700 dark:text-zinc-300">
            {refusalMessage(refusal, isMonth)}
          </p>
          {(refusal === 'too-different' || refusal === 'no-updates-left') &&
            newPack}
        </div>
      )}
    </div>
  )
}
