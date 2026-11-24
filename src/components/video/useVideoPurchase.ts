'use client'

import { useCalendarAccount } from '@/lib/calendar-sync/CalendarAccountContext'
import { trackEvent } from '@/lib/tracking'
import type { CountryVisit } from '@/lib/types'
import type { VideoTheme } from '@/lib/video'
import {
  createVideoOrder,
  type CreateOrderError,
  fetchVideoAccount,
  goToCheckout,
  orderStage,
  type OrderSummary,
  type VideoAccount,
  withCheckoutTheme,
} from '@/lib/videos/client'
import type { VideoPeriod } from '@/lib/videos/period'
import { useVideoOrder } from '@/lib/videos/useVideoOrder'
import { useEffect, useRef, useState } from 'react'

export type PurchaseStep = 'offer' | 'sign-in' | 'order' | 'owned'

interface VideoPurchaseOptions {
  open: boolean
  period: VideoPeriod
  visits: CountryVisit[]
  weekStartsOn: number
  price: number
  clickContext: Record<string, unknown>
  initialOrderId?: string
}

function siteTheme(): VideoTheme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function samePeriod(
  order: { pack: string; year: number; month: number | null },
  period: VideoPeriod
) {
  return (
    order.pack === period.pack &&
    order.year === period.year &&
    (period.pack === 'year' || order.month === period.month)
  )
}

export function useVideoPurchase({
  open,
  period,
  visits,
  weekStartsOn,
  price,
  clickContext,
  initialOrderId,
}: VideoPurchaseOptions) {
  const calendarAccount = useCalendarAccount()
  const { account, ready } = calendarAccount
  const [step, setStep] = useState<Exclude<PurchaseStep, 'owned'>>(
    initialOrderId ? 'order' : 'offer'
  )
  const [buyAgain, setBuyAgain] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(initialOrderId ?? null)
  const [busy, setBusy] = useState<'creating' | 'redirecting' | null>(null)
  const [error, setError] = useState<CreateOrderError | null>(null)
  const [awaitingAccount, setAwaitingAccount] = useState(false)
  const [videoAccount, setVideoAccount] = useState<{
    userId: string
    data: VideoAccount | null
  } | null>(null)
  const trackedRef = useRef(new Set<string>())

  const accountId = account?.id ?? null
  const accountInfo =
    videoAccount && videoAccount.userId === accountId ? videoAccount : null
  const ownedOrder: OrderSummary | null =
    accountInfo?.data?.orders.find(
      (order) => order.status === 'paid' && samePeriod(order, period)
    ) ?? null
  const view: PurchaseStep =
    step === 'offer' && ownedOrder && !buyAgain ? 'owned' : step
  const watched = useVideoOrder(
    view === 'order' ? orderId : view === 'owned' ? ownedOrder!.id : null,
    { enabled: open, initial: view === 'owned' ? ownedOrder : null }
  )
  const periodContext = {
    pack: period.pack,
    year: period.year,
    ...(period.pack === 'month' && { month: period.month }),
  }

  useEffect(() => {
    if (!open || !accountId || !ready) return
    let cancelled = false
    fetchVideoAccount()
      .then((data) => {
        if (!cancelled) setVideoAccount({ userId: accountId, data })
      })
      .catch(() => {
        if (!cancelled) setVideoAccount({ userId: accountId, data: null })
      })
    return () => {
      cancelled = true
    }
  }, [open, accountId, ready])

  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(null)
    }
    window.addEventListener('pageshow', onPageShow)
    return () => window.removeEventListener('pageshow', onPageShow)
  }, [])

  const stage = watched.order ? orderStage(watched.order) : null
  const pack = watched.order?.pack ?? period.pack

  useEffect(() => {
    if (view !== 'order' || !orderId) return
    if (stage !== 'ready' && stage !== 'failed') return
    const key = `${orderId}:${stage}`
    if (trackedRef.current.has(key)) return
    trackedRef.current.add(key)
    trackEvent(
      stage === 'ready' ? 'animated_video_ready' : 'animated_video_failed',
      stage === 'ready' ? { pack } : { pack, stage: 'render' }
    )
  }, [view, orderId, stage, pack])

  const savingCalendar =
    (awaitingAccount && !account) || (account !== null && !ready)
  const checkingAccount =
    savingCalendar || (account !== null && accountInfo === null)
  const freeVideo = accountInfo?.data?.freeVideo ?? false

  const buy = async () => {
    setError(null)
    trackEvent('animated_video_buy_click', {
      ...clickContext,
      signedIn: account !== null,
      ...(account && { free: freeVideo }),
      ...(ownedOrder && { again: true }),
    })
    if (!account) {
      trackEvent('animated_video_sign_in_shown', periodContext)
      setStep('sign-in')
      return
    }
    if (checkingAccount) return

    setBusy('creating')
    const result = await createVideoOrder(period, visits, weekStartsOn)
    if (!result.ok) {
      setBusy(null)
      if (result.error === 'signed-out') {
        setStep('sign-in')
        return
      }
      setError(result.error)
      trackEvent('animated_video_failed', {
        ...periodContext,
        stage: 'order',
        reason: result.error,
      })
      return
    }
    if (result.free) {
      trackEvent('animated_video_free_claimed', periodContext)
      setBusy(null)
      setOrderId(result.orderId)
      setStep('order')
      return
    }
    trackEvent('animated_video_checkout_opened', { ...periodContext, price })
    setBusy('redirecting')
    goToCheckout(withCheckoutTheme(result.checkoutUrl, siteTheme()))
  }

  const handleSignedIn = () => {
    setAwaitingAccount(true)
    setStep('offer')
    calendarAccount.checkSession()
  }

  return {
    step: view,
    setStep,
    ownedOrder,
    showNewPack: () => setBuyAgain(true),
    showOwned: () => setBuyAgain(false),
    watchOrder: watched.watch,
    account,
    accountReady: !checkingAccount,
    savingCalendar,
    syncFailed: account !== null && calendarAccount.status === 'error',
    freeVideo,
    ownsPeriod: ownedOrder !== null,
    busy,
    error,
    buy,
    handleSignedIn,
    order: watched.order,
    stage,
    missing: watched.missing,
    timedOut: watched.timedOut,
    freshOrder: watched.freshOrder,
    reloadOrder: watched.reload,
  }
}
