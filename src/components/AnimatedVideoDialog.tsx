'use client'

import { FreeVideoPrice } from '@/components/FreeVideoPrice'
import SignInForm from '@/components/account/SignInForm'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { VideoWaitlistJoined } from '@/components/VideoWaitlistJoined'
import { monthTimeline } from '@/components/video/MonthVideo'
import PackVideoPlayer from '@/components/video/PackVideoPlayer'
import {
  PreviewVideo,
  type PreviewVideoProps,
} from '@/components/video/PreviewVideo'
import PackUpdate, {
  type PackCalendarState,
} from '@/components/video/PackUpdate'
import SaveVideoButton from '@/components/video/SaveVideoButton'
import Segmented from '@/components/video/Segmented'
import { STATS_DURATION } from '@/components/video/StatsVideo'
import { FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from '@/components/video/tokens'
import { usePrefetchVideoImages } from '@/components/video/usePrefetchVideoImages'
import { useVideoPurchase } from '@/components/video/useVideoPurchase'
import { useVideoSales } from '@/components/video/VideoSalesProvider'
import { yearFillTimeline } from '@/components/video/YearFillVideo'
import { detectInAppBrowser } from '@/lib/attribution/in-app-browser'
import { useCalendarAccount } from '@/lib/calendar-sync/CalendarAccountContext'
import { toCalendarDays } from '@/lib/calendar-sync/days'
import { MONTH_NAMES } from '@/lib/constants'
import { useSettings } from '@/lib/contexts/SettingsContext'
import type { ExportType } from '@/lib/feedback/types'
import { useAccountEmail } from '@/lib/hooks/useAccountEmail'
import { trackEvent } from '@/lib/tracking'
import type { CalendarData } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  buildMonthVideoData,
  buildYearVideoData,
  type VideoKind,
  type VideoTheme,
} from '@/lib/video'
import { formatPrice, VIDEO_LAUNCH_LABEL } from '@/lib/video-offer'
import { videoResumePath } from '@/lib/videos/checkout-return'
import type { CreateOrderError, OrderStage } from '@/lib/videos/client'
import type { VideoPeriod } from '@/lib/videos/period'
import { joinWaitlist, leaveWaitlist } from '@/lib/waitlist/client'
import { useWaitlistStatus } from '@/lib/waitlist/useWaitlistStatus'
import { Player } from '@remotion/player'
import {
  Check,
  CheckCircle2,
  Gift,
  Loader2,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import Link from 'next/link'
import {
  type FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'

interface AnimatedVideoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  calendarData: CalendarData
  year: number
  month?: number
  exportType: ExportType
  price: number
  initialKind?: VideoKind
  initialTheme?: VideoTheme
  initialOrderId?: string
}

type Step = 'offer' | 'waitlist' | 'joined'

const FORMAT_AND_PAYMENT = [
  'Full HD 1080×1920 MP4, no watermark',
  'One-time payment, saved to your free account',
]

const UPDATES_LINE = 'Update it with new trips, up to 3 times'

const linkClassName =
  'font-medium text-gray-900 underline underline-offset-2 dark:text-zinc-100'

function initialTheme(): VideoTheme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

const subscribeNothing = () => () => {}

function useGoogleSignIn(configured: boolean) {
  return useSyncExternalStore(
    subscribeNothing,
    () => configured && !detectInAppBrowser(navigator.userAgent, window),
    () => false
  )
}

function errorMessage(error: CreateOrderError, periodLabel: string) {
  switch (error) {
    case 'no-trips':
      return `Add a trip in ${periodLabel} first.`
    case 'rate-limited':
      return 'Too many tries in the last hour. Try again later.'
    case 'checkout-unavailable':
      return "Checkout isn't available right now. Try again in a few minutes."
    default:
      return 'Something went wrong. Try again.'
  }
}

function orderCopy(
  stage: OrderStage | 'loading' | 'not-found' | 'signed-out',
  timedOut: boolean,
  isMonthly: boolean
): { title: string; description: string; working: boolean } {
  const noun = isMonthly ? 'video' : 'videos'
  const they = isMonthly ? "it's" : "they're"
  const them = isMonthly ? 'it' : 'them'
  const are = isMonthly ? 'is' : 'are'
  switch (stage) {
    case 'loading':
      return {
        title: 'Checking your order',
        description: 'One moment.',
        working: true,
      }
    case 'confirming':
      return timedOut
        ? {
            title: 'Your payment is still going through',
            description: `We'll email you when your ${noun} ${are} ready.`,
            working: false,
          }
        : {
            title: 'Confirming your payment',
            description: 'This usually takes a few seconds.',
            working: true,
          }
    case 'making':
      return timedOut
        ? {
            title: `Still making your ${noun}`,
            description: `This is taking longer than usual. We'll email you when ${they} ready, and you'll find ${them} in your account.`,
            working: false,
          }
        : {
            title: `Making your ${noun}`,
            description: `Usually under a minute. We'll email you when ${they} ready, so you can close this.`,
            working: true,
          }
    case 'ready':
      return {
        title: `Your ${noun} ${are} ready`,
        description: isMonthly
          ? 'Pick dark or light, then save it.'
          : 'Pick a video and dark or light, then save it.',
        working: false,
      }
    case 'failed':
      return {
        title: "We're on it",
        description: `Something went wrong making your ${noun}. We'll fix it and email you when ${they} ready.`,
        working: false,
      }
    case 'refunded':
      return {
        title: 'This order was refunded',
        description: `Its ${noun} ${are} no longer available.`,
        working: false,
      }
    case 'not-found':
      return {
        title: "We couldn't find this order",
        description: `If you paid, your ${noun} will be in your account.`,
        working: false,
      }
    case 'signed-out':
      return {
        title: `Sign in to see your ${noun}`,
        description: `Your ${noun} ${are} saved to the account you used to buy ${them}.`,
        working: false,
      }
  }
}

export default function AnimatedVideoDialog({
  open,
  onOpenChange,
  calendarData,
  year,
  month,
  exportType,
  price,
  initialKind,
  initialTheme: startTheme,
  initialOrderId,
}: AnimatedVideoDialogProps) {
  const { settings } = useSettings()
  const accountEmail = useAccountEmail()
  const calendarAccount = useCalendarAccount()
  const videoSales = useVideoSales()
  const salesEnabled = videoSales.enabled
  const googleEnabled = useGoogleSignIn(videoSales.googleSignIn)
  const isMonthly = exportType === 'monthly' && month !== undefined
  const [kind, setKind] = useState<VideoKind>(
    initialKind ??
      (isMonthly ? 'month' : exportType === 'statistics' ? 'stats' : 'year')
  )
  const [theme, setTheme] = useState<VideoTheme>(startTheme ?? initialTheme)
  const [step, setStep] = useState<Step>('offer')
  const [joinedOnAccount, setJoinedOnAccount] = useWaitlistStatus(
    'animated_video',
    accountEmail
  )
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const period: VideoPeriod = isMonthly
    ? { pack: 'month', year, month }
    : { pack: 'year', year }

  const yearData = useMemo(
    () => buildYearVideoData(calendarData.visits, year),
    [calendarData.visits, year]
  )
  const monthData = useMemo(
    () =>
      month === undefined
        ? null
        : buildMonthVideoData(calendarData.visits, year, month),
    [calendarData.visits, year, month]
  )
  const inputProps = useMemo<PreviewVideoProps>(() => {
    const shared = {
      theme,
      weekStartsOn: settings.weekStartsOn,
    }
    if (kind === 'month' && monthData) {
      return { ...shared, kind, data: monthData }
    }
    return {
      ...shared,
      kind: kind === 'stats' ? 'stats' : 'year',
      data: yearData,
    }
  }, [kind, monthData, yearData, theme, settings.weekStartsOn])
  usePrefetchVideoImages(inputProps.data.countries)

  const duration =
    inputProps.kind === 'month'
      ? monthTimeline(inputProps.data.days.length).duration
      : inputProps.kind === 'year'
        ? yearFillTimeline(inputProps.data.days.length).duration
        : STATS_DURATION

  const monthName = month === undefined ? '' : MONTH_NAMES[month]
  const periodLabel = isMonthly ? `${monthName} ${year}` : String(year)
  const noun = isMonthly ? 'video' : 'videos'
  const included = salesEnabled
    ? [
        isMonthly
          ? 'Month pack: dark and light versions'
          : 'Year pack: both videos, in dark and light',
        ...FORMAT_AND_PAYMENT,
        UPDATES_LINE,
      ]
    : isMonthly
      ? ['Dark and light versions', ...FORMAT_AND_PAYMENT]
      : ['Both videos, in dark and light', ...FORMAT_AND_PAYMENT]
  const context = {
    exportType,
    videoKind: kind,
    year,
    ...(isMonthly && { month }),
    price,
  }

  const purchase = useVideoPurchase({
    open: open && salesEnabled,
    period,
    visits: calendarData.visits,
    weekStartsOn: settings.weekStartsOn,
    price,
    clickContext: { ...context, theme },
    initialOrderId,
  })
  const salesStep = salesEnabled ? purchase.step : null
  const packOrder =
    salesStep === 'owned' ||
    (salesStep === 'order' && purchase.stage === 'ready')
      ? purchase.order
      : null
  const shownOrder = packOrder && packOrder.videos.length > 0 ? packOrder : null
  const shownVideo = shownOrder
    ? (shownOrder.videos.find(
        (video) => video.kind === kind && video.theme === theme
      ) ??
      shownOrder.videos.find((video) => video.theme === theme) ??
      shownOrder.videos[0])
    : null
  const panelFirst =
    salesStep === 'sign-in' ||
    ((salesStep === 'order' || salesStep === 'owned') && !shownOrder)
  const calendarState: PackCalendarState = calendarAccount.ready
    ? 'saved'
    : calendarAccount.status === 'error'
      ? 'error'
      : 'loading'

  const lastStepRef = useRef(salesStep)
  useEffect(() => {
    if (lastStepRef.current === salesStep) return
    lastStepRef.current = salesStep
    panelRef.current?.scrollIntoView?.({ block: 'nearest' })
    panelRef.current?.focus({ preventScroll: true })
  }, [salesStep])

  const handleBuy = () => {
    trackEvent('animated_video_buy_click', { ...context, theme })
    setStep('waitlist')
  }

  const handleJoin = async (event: FormEvent) => {
    event.preventDefault()
    setIsSending(true)
    setError(null)
    try {
      await joinWaitlist({
        email: accountEmail ?? email,
        feature: 'animated_video',
        context: { ...context, launchOffer: 'first_video_free' },
      })
      setStep('joined')
      if (accountEmail) setJoinedOnAccount(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSending(false)
    }
  }

  const handleLeave = async () => {
    await leaveWaitlist('animated_video')
    setJoinedOnAccount(false)
    setStep('offer')
  }

  const shownStep: Step = joinedOnAccount === true ? 'joined' : step

  const offerHeader = (
    <>
      <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400">
        <Sparkles className="size-3.5" />
        New: animated video
      </span>
      <DialogTitle className="mb-2 font-serif text-2xl leading-tight font-normal text-gray-900 md:mb-3 md:text-3xl dark:text-zinc-100">
        Your {isMonthly ? monthName : year}, animated
      </DialogTitle>
      <DialogDescription className="mb-5 text-sm leading-relaxed text-gray-600 md:text-base dark:text-zinc-400">
        {isMonthly
          ? `A short video made from your trips in ${monthName}: the month filling up flag by flag, then your numbers.`
          : 'Two short videos made from your trips: your calendar filling up flag by flag, and your stats counting up.'}{' '}
        Made for Reels, Stories and TikTok.
      </DialogDescription>

      <ul className="mb-6 space-y-2">
        {included.map((item) => (
          <li
            key={item}
            className="flex items-center gap-2 text-sm text-gray-700 dark:text-zinc-300"
          >
            <Check className="size-4 shrink-0 text-red-500" />
            {item}
          </li>
        ))}
      </ul>
    </>
  )

  const stepHeader = (title: string, description: string) => (
    <>
      <DialogTitle className="mb-2 font-serif text-2xl leading-tight font-normal text-gray-900 md:mb-3 md:text-3xl dark:text-zinc-100">
        {title}
      </DialogTitle>
      <DialogDescription className="mb-5 text-sm leading-relaxed text-gray-600 md:text-base dark:text-zinc-400">
        {description}
      </DialogDescription>
    </>
  )

  const renderSalesOffer = () => {
    const buyLabel = purchase.busy
      ? purchase.freeVideo
        ? `Starting your ${noun}…`
        : 'Opening checkout…'
      : purchase.savingCalendar
        ? 'Saving your calendar…'
        : !purchase.accountReady
          ? 'One moment…'
          : purchase.freeVideo
            ? `Get my ${noun} free`
            : `Get my ${noun} · ${formatPrice(price)}`
    const waiting = purchase.busy !== null || !purchase.accountReady

    return (
      <>
        {offerHeader}
        {purchase.ownsPeriod && (
          <p className="mb-3 text-sm text-gray-600 dark:text-zinc-400">
            You already have videos for {periodLabel}. A new pack comes with 3
            more updates.{' '}
            <Button
              variant="link"
              className="h-auto p-0 align-baseline text-sm text-gray-900 underline dark:text-zinc-100"
              onClick={purchase.showOwned}
            >
              Back to your {noun}
            </Button>
          </p>
        )}
        {purchase.freeVideo && (
          <p className="mb-3 flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
            <Gift className="size-4 shrink-0" />
            Your first video is free
          </p>
        )}
        <Button
          size="lg"
          className="w-full"
          onClick={purchase.buy}
          disabled={waiting}
        >
          {waiting && <Loader2 className="size-4 animate-spin" />}
          {buyLabel}
        </Button>
        {purchase.error && (
          <p
            role="alert"
            className="mt-3 text-center text-sm text-red-600 dark:text-red-400"
          >
            {errorMessage(purchase.error, periodLabel)}
          </p>
        )}
        {purchase.syncFailed && (
          <p
            role="status"
            className="mt-3 text-center text-sm text-gray-600 dark:text-zinc-400"
          >
            We couldn&apos;t reach your account. We&apos;ll keep trying.
          </p>
        )}
        <p className="mt-3 text-center text-xs break-words text-gray-500 dark:text-zinc-500">
          {purchase.account
            ? `${purchase.freeVideo ? '' : "You'll pay on Polar's secure checkout. "}Signed in as ${purchase.account.email}.`
            : "You'll sign in with your email next. Your images stay free."}
        </p>
      </>
    )
  }

  const renderSignIn = () => (
    <>
      {stepHeader(
        `Sign in to get your ${noun}`,
        `Your ${noun} ${isMonthly ? 'is' : 'are'} saved to a free account, so you can download ${isMonthly ? 'it' : 'them'} again or add trips later. New here? Signing in creates your account.`
      )}
      <SignInForm
        googleEnabled={googleEnabled}
        next={videoResumePath({ kind, theme, year, month })}
        source="video"
        onSignedIn={purchase.handleSignedIn}
      />
      <p className="mt-4 text-xs text-gray-500 dark:text-zinc-500">
        By signing in, you agree to the{' '}
        <Link href="/terms" target="_blank" className={linkClassName}>
          Terms
        </Link>{' '}
        and the{' '}
        <Link href="/privacy" target="_blank" className={linkClassName}>
          Privacy policy
        </Link>
        .
      </p>
      <Button
        variant="link"
        className="mt-2 h-auto w-fit p-0"
        onClick={() => purchase.setStep('offer')}
      >
        Back
      </Button>
    </>
  )

  const renderOrder = () => {
    const stage = purchase.missing ?? purchase.stage ?? 'loading'
    const copy = orderCopy(stage, purchase.timedOut, isMonthly)

    return (
      <>
        {copy.working && (
          <Loader2
            aria-hidden
            className="mb-4 size-6 animate-spin text-red-500"
          />
        )}
        {stage === 'failed' && (
          <TriangleAlert aria-hidden className="mb-4 size-6 text-amber-500" />
        )}
        {stage === 'ready' && (
          <CheckCircle2 aria-hidden className="mb-4 size-6 text-emerald-500" />
        )}
        {stepHeader(copy.title, copy.description)}
        {shownOrder && shownVideo && (
          <SaveVideoButton
            order={shownOrder}
            video={shownVideo}
            freshOrder={purchase.freshOrder}
            source="dialog"
          />
        )}
        {stage === 'signed-out' && (
          <Button asChild size="lg" className="w-full">
            <Link href="/sign-in?next=/account">Sign in</Link>
          </Button>
        )}
        {stage === 'not-found' && (
          <Button asChild variant="outline" size="lg" className="w-full">
            <Link href="/account">Go to your account</Link>
          </Button>
        )}
        {(stage === 'ready' ||
          stage === 'making' ||
          stage === 'confirming' ||
          stage === 'failed') && (
          <p className="mt-4 text-sm text-gray-600 dark:text-zinc-400">
            {stage === 'ready'
              ? `${isMonthly ? "It's" : "They're"} saved in your account too.`
              : `You'll find your ${noun} in your account once ${isMonthly ? "it's" : "they're"} ready.`}{' '}
            <Link href="/account" className={linkClassName}>
              Your account
            </Link>
          </p>
        )}
      </>
    )
  }

  const renderOwned = () => {
    const order = purchase.order
    if (!shownOrder || !shownVideo || !order) return renderOrder()
    const stage = purchase.stage
    const working = stage === 'making' || stage === 'confirming'
    const are = isMonthly ? 'is' : 'are'
    let status: string | null = null
    if (working) {
      status = purchase.timedOut
        ? `This is taking longer than usual. We'll email you when your ${noun} ${are} ready.`
        : `Updating your ${noun} with your latest trips. Usually under a minute.`
    } else if (stage === 'failed') {
      status =
        "Your last update didn't work. We're on it, and we'll email you when it's done."
    }

    return (
      <>
        {stepHeader(
          isMonthly ? `Your ${monthName} video` : `Your ${year} videos`,
          `You have the ${isMonthly ? 'month' : 'year'} pack for ${periodLabel}. ${
            isMonthly
              ? 'Pick dark or light, then save it.'
              : 'Pick a video and dark or light, then save it.'
          }`
        )}
        {status && (
          <p
            role="status"
            className="mb-4 flex items-start gap-2 text-sm text-gray-600 dark:text-zinc-400"
          >
            {working && !purchase.timedOut && (
              <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
            )}
            {status}
          </p>
        )}
        <SaveVideoButton
          order={shownOrder}
          video={shownVideo}
          freshOrder={purchase.freshOrder}
          source="dialog"
        />
        <div className="mt-5 border-t border-gray-200 pt-5 dark:border-white/8">
          <PackUpdate
            order={order}
            calendar={calendarState}
            readDays={() => toCalendarDays(calendarData.visits)}
            onStarted={purchase.watchOrder}
            onNewPack={purchase.showNewPack}
            source="dialog"
          />
        </div>
        <p className="mt-4 text-sm text-gray-600 dark:text-zinc-400">
          {isMonthly ? "It's" : "They're"} saved in your account too.{' '}
          <Link href="/account" className={linkClassName}>
            Your account
          </Link>
        </p>
      </>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl max-h-[90dvh] p-0 gap-0 overflow-auto scrollbar-hide bg-white outline-none dark:bg-[#141414] border dark:border-white/8">
        <div className="grid md:grid-cols-2">
          <div
            className={cn(
              'flex flex-col items-center justify-center gap-3 bg-linear-to-br from-gray-50 to-stone-50 p-4 md:p-8 dark:bg-none dark:bg-[#111111]',
              !panelFirst && 'pt-12'
            )}
          >
            <div className="relative aspect-9/16 w-full max-w-[26dvh] overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/5 md:max-w-[38dvh] dark:ring-white/8">
              {shownVideo ? (
                <PackVideoPlayer
                  video={shownVideo}
                  autoPlay
                  preload="auto"
                  onExpired={purchase.reloadOrder}
                />
              ) : (
                <Player
                  key={kind}
                  component={PreviewVideo}
                  inputProps={inputProps}
                  durationInFrames={duration}
                  compositionWidth={VIDEO_WIDTH}
                  compositionHeight={VIDEO_HEIGHT}
                  fps={FPS}
                  autoPlay
                  loop
                  initiallyMuted
                  controls
                  clickToPlay
                  showVolumeControls={false}
                  acknowledgeRemotionLicense
                  style={{ width: '100%', height: '100%' }}
                />
              )}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {!isMonthly && (
                <Segmented
                  label="Video"
                  value={kind}
                  onChange={setKind}
                  options={[
                    { value: 'year', label: 'Your year' },
                    { value: 'stats', label: 'Your stats' },
                  ]}
                />
              )}
              <Segmented
                label="Theme"
                value={theme}
                onChange={setTheme}
                options={[
                  { value: 'dark', label: 'Dark' },
                  { value: 'light', label: 'Light' },
                ]}
              />
            </div>
          </div>

          <div
            ref={panelRef}
            tabIndex={-1}
            className={cn(
              'flex scroll-mt-4 flex-col justify-center p-6 outline-none md:p-10',
              panelFirst && 'order-first pt-12 md:order-none md:pt-10'
            )}
          >
            {salesStep === 'offer' && renderSalesOffer()}
            {salesStep === 'sign-in' && renderSignIn()}
            {salesStep === 'order' && renderOrder()}
            {salesStep === 'owned' && renderOwned()}

            {salesStep === null && offerHeader}

            {salesStep === null && shownStep === 'offer' && (
              <>
                <Button size="lg" className="w-full" onClick={handleBuy}>
                  Get the {isMonthly ? 'video' : 'videos'} ·{' '}
                  <FreeVideoPrice price={price} />
                </Button>
                <p className="mt-3 text-center text-xs text-gray-500 dark:text-zinc-500">
                  Free when you join the list before launch. Your images stay
                  free.
                </p>
              </>
            )}

            {salesStep === null && shownStep === 'waitlist' && (
              <form
                onSubmit={handleJoin}
                className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/8 dark:bg-white/5"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                    Launching in {VIDEO_LAUNCH_LABEL}
                  </p>
                  <label
                    htmlFor="video-waitlist-email"
                    className="block text-xs text-gray-600 dark:text-zinc-400"
                  >
                    Join the list to get your{' '}
                    <span className="font-medium text-gray-900 dark:text-zinc-100">
                      first video free
                    </span>{' '}
                    at launch. We&apos;ll email you once, when videos are ready.
                  </label>
                </div>
                <div className="flex gap-2">
                  <Input
                    id="video-waitlist-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={accountEmail ?? email}
                    readOnly={accountEmail !== null}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!error || undefined}
                    className="bg-white read-only:bg-gray-100 read-only:text-gray-600 dark:bg-[#141414] dark:read-only:bg-white/5 dark:read-only:text-zinc-400"
                  />
                  <Button type="submit" disabled={isSending}>
                    {isSending && <Loader2 className="size-4 animate-spin" />}
                    Notify me
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-zinc-500">
                  {accountEmail
                    ? "This is the email you sign in with. We'll only use it for this."
                    : "We'll only use your email for this."}{' '}
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="underline underline-offset-2 hover:text-gray-900 dark:hover:text-zinc-100"
                  >
                    Privacy
                  </Link>
                </p>
                {error && (
                  <p
                    role="alert"
                    className="text-xs text-red-600 dark:text-red-400"
                  >
                    {error}
                  </p>
                )}
              </form>
            )}

            {salesStep === null && shownStep === 'joined' && (
              <VideoWaitlistJoined
                onLeave={accountEmail ? handleLeave : undefined}
                className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-white/8 dark:bg-white/5 dark:text-zinc-300"
              />
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
