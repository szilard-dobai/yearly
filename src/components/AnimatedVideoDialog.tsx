'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { monthTimeline } from '@/components/video/MonthVideo'
import {
  PreviewVideo,
  type PreviewVideoProps,
} from '@/components/video/PreviewVideo'
import { STATS_DURATION } from '@/components/video/StatsVideo'
import { FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from '@/components/video/tokens'
import { yearFillTimeline } from '@/components/video/YearFillVideo'
import { MONTH_NAMES } from '@/lib/constants'
import { useSettings } from '@/lib/contexts/SettingsContext'
import type { ExportType } from '@/lib/feedback/types'
import { trackEvent } from '@/lib/tracking'
import type { CalendarData } from '@/lib/types'
import {
  buildMonthVideoData,
  buildYearVideoData,
  type VideoKind,
  type VideoTheme,
} from '@/lib/video'
import { formatPrice, VIDEO_LAUNCH_LABEL } from '@/lib/video-offer'
import { joinWaitlist } from '@/lib/waitlist/client'
import { Player } from '@remotion/player'
import { Check, CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { type FormEvent, useMemo, useState } from 'react'

interface AnimatedVideoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  calendarData: CalendarData
  year: number
  month?: number
  exportType: ExportType
  price: number
}

type Step = 'offer' | 'waitlist' | 'joined'

const FORMAT_AND_PAYMENT = [
  'Full HD 1080×1920 MP4, no watermark',
  'One-time payment, no account needed',
]

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-full bg-gray-200/70 p-0.5 text-xs font-medium dark:bg-white/8"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className="cursor-pointer rounded-full px-3 py-1.5 text-gray-600 transition-colors hover:text-gray-900 aria-checked:bg-white aria-checked:text-gray-900 aria-checked:shadow-sm dark:text-zinc-400 dark:hover:text-zinc-100 dark:aria-checked:bg-zinc-100 dark:aria-checked:text-gray-900"
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function initialTheme(): VideoTheme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export default function AnimatedVideoDialog({
  open,
  onOpenChange,
  calendarData,
  year,
  month,
  exportType,
  price,
}: AnimatedVideoDialogProps) {
  const { settings } = useSettings()
  const isMonthly = exportType === 'monthly' && month !== undefined
  const [kind, setKind] = useState<VideoKind>(
    isMonthly ? 'month' : exportType === 'statistics' ? 'stats' : 'year'
  )
  const [theme, setTheme] = useState<VideoTheme>(initialTheme)
  const [step, setStep] = useState<Step>('offer')
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      flagMode: settings.flagDisplayMode,
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
  }, [
    kind,
    monthData,
    yearData,
    theme,
    settings.flagDisplayMode,
    settings.weekStartsOn,
  ])

  const duration =
    inputProps.kind === 'month'
      ? monthTimeline(inputProps.data.days.length).duration
      : inputProps.kind === 'year'
        ? yearFillTimeline(inputProps.data.days.length).duration
        : STATS_DURATION

  const monthName = month === undefined ? '' : MONTH_NAMES[month]
  const included = isMonthly
    ? ['Dark and light versions', ...FORMAT_AND_PAYMENT]
    : ['Both videos, in dark and light', ...FORMAT_AND_PAYMENT]
  const context = {
    exportType,
    videoKind: kind,
    year,
    ...(isMonthly && { month }),
    price,
  }

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
        email,
        feature: 'animated_video',
        context: { ...context, launchOffer: 'first_video_free' },
      })
      setStep('joined')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl max-h-[90dvh] p-0 gap-0 overflow-auto scrollbar-hide bg-white dark:bg-[#141414] border dark:border-white/8">
        <div className="grid md:grid-cols-2">
          <div className="flex flex-col items-center justify-center gap-3 bg-linear-to-br from-gray-50 to-stone-50 p-4 pt-12 md:p-8 dark:bg-none dark:bg-[#111111]">
            <div className="relative aspect-9/16 w-full max-w-[26dvh] overflow-hidden rounded-xl shadow-2xl ring-1 ring-black/5 md:max-w-[38dvh] dark:ring-white/8">
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

          <div className="flex flex-col justify-center p-6 md:p-10">
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

            {step === 'offer' && (
              <>
                <Button size="lg" className="w-full" onClick={handleBuy}>
                  Get the {isMonthly ? 'video' : 'videos'} ·{' '}
                  {formatPrice(price)}
                </Button>
                <p className="mt-3 text-center text-xs text-gray-500 dark:text-zinc-500">
                  Your images stay free.
                </p>
              </>
            )}

            {step === 'waitlist' && (
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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    aria-invalid={!!error || undefined}
                    className="bg-white dark:bg-[#141414]"
                  />
                  <Button type="submit" disabled={isSending}>
                    {isSending && <Loader2 className="size-4 animate-spin" />}
                    Notify me
                  </Button>
                </div>
                <p className="text-xs text-gray-500 dark:text-zinc-500">
                  We&apos;ll only use your email for this.{' '}
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

            {step === 'joined' && (
              <div
                role="status"
                className="flex items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-white/8 dark:bg-white/5 dark:text-zinc-300"
              >
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
                <p>
                  <span className="font-medium text-gray-900 dark:text-zinc-100">
                    You&apos;re on the list.
                  </span>{' '}
                  We&apos;ll email you when videos launch in{' '}
                  {VIDEO_LAUNCH_LABEL}. Your first video is free.
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
