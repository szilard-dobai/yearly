'use client'

import AcquisitionSurvey from '@/components/AcquisitionSurvey'
import FeedbackPrompt from '@/components/FeedbackPrompt'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  markAcquisitionSurveyShown,
  shouldShowAcquisitionSurvey,
} from '@/lib/attribution/survey'
import {
  markFeedbackPromptShown,
  shouldShowFeedbackPrompt,
} from '@/lib/feedback/prompt'
import {
  EXPORT_CANVAS,
  EXPORT_FORMATS,
  type ExportFormat,
} from '@/lib/export-canvas'
import type { ExportType } from '@/lib/feedback/types'
import { buildShareText } from '@/lib/share'
import { trackEvent } from '@/lib/tracking'
import { getDeviceId } from '@/lib/tracking/device-id'
import { summarizeCalendar } from '@/lib/tracking/trip-summary'
import type { CalendarData } from '@/lib/types'
import { getAnimatedVideoPrice } from '@/lib/video-offer'
import { ChevronRight, Download, Loader2, Play } from 'lucide-react'
import { motion } from 'motion/react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'
import YearEndReminderCard from './YearEndReminderCard'

const AnimatedVideoDialog = dynamic(() => import('./AnimatedVideoDialog'), {
  ssr: false,
})

const VIDEO_OFFER_COPY: Record<ExportType, string> = {
  calendar: 'Watch your year fill up, flag by flag.',
  statistics: 'Watch your travel stats count up.',
  monthly: 'Watch your month fill up, flag by flag.',
}

interface ImagePreviewModalProps {
  open: boolean
  imageDataUrl: string | null
  filename: string
  year: number
  month?: number
  calendarData: CalendarData
  exportType: ExportType
  format: ExportFormat
  onFormatChange: (format: ExportFormat) => void
  isRendering: boolean
  onOpenChange: (open: boolean) => void
}

type ImagePreviewContentProps = Omit<
  ImagePreviewModalProps,
  'open' | 'onOpenChange'
>

type PostDownloadPrompt =
  | 'survey'
  | 'feedback'
  | 'feedback_after_survey'
  | 'closed'

const FORMAT_HINTS: Record<ExportFormat, string> = {
  story: 'Stories & TikTok',
  feed: 'Instagram feed',
}

function FormatPicker({
  format,
  disabled,
  onChange,
}: {
  format: ExportFormat
  disabled: boolean
  onChange: (format: ExportFormat) => void
}) {
  return (
    <div
      role="group"
      aria-label="Image format"
      className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-gray-100 p-1 dark:bg-white/5"
    >
      {EXPORT_FORMATS.map((option) => {
        const { width, height, label, ratio } = EXPORT_CANVAS[option]
        const selected = option === format
        return (
          <button
            key={option}
            type="button"
            aria-pressed={selected}
            data-export-format={option}
            disabled={disabled}
            onClick={() => !selected && onChange(option)}
            className={cn(
              'flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left transition-colors disabled:cursor-default',
              selected
                ? 'bg-white shadow-sm dark:bg-[#222222]'
                : 'hover:bg-white/60 dark:hover:bg-white/5'
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'h-6 shrink-0 rounded-sm border-2',
                selected
                  ? 'border-gray-900 dark:border-zinc-100'
                  : 'border-gray-400 dark:border-zinc-500'
              )}
              style={{ aspectRatio: `${width} / ${height}` }}
            />
            <span className="min-w-0">
              <span
                className={cn(
                  'block text-sm font-medium',
                  selected
                    ? 'text-gray-900 dark:text-zinc-100'
                    : 'text-gray-600 dark:text-zinc-400'
                )}
              >
                {label} <span className="font-normal">{ratio}</span>
              </span>
              <span className="block truncate text-xs text-gray-500 dark:text-zinc-500">
                {FORMAT_HINTS[option]}
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ImagePreviewContent({
  imageDataUrl,
  filename,
  year,
  month,
  calendarData,
  exportType,
  format,
  onFormatChange,
  isRendering,
}: ImagePreviewContentProps) {
  const [prompt, setPrompt] = useState<PostDownloadPrompt | null>(null)
  const [videoOpen, setVideoOpen] = useState(false)
  const [videoPrice, setVideoPrice] = useState<number | null>(null)

  const isMonthly = exportType === 'monthly'
  const showVideoOffer = calendarData.visits.some(
    (v) =>
      v.date.getFullYear() === year &&
      (!isMonthly || v.date.getMonth() === month)
  )

  const openVideoPreview = () => {
    const price = getAnimatedVideoPrice(getDeviceId())
    trackEvent('animated_video_preview_open', {
      exportType,
      year,
      ...(isMonthly && { month }),
      price,
    })
    setVideoPrice(price)
    setVideoOpen(true)
  }

  const showFeedbackPrompt = (afterSurvey: boolean) => {
    markFeedbackPromptShown()
    trackEvent('feedback_prompt_shown', {
      source: 'post_export',
      exportType,
      year,
      ...(afterSurvey && { afterSurvey }),
    })
    setPrompt(afterSurvey ? 'feedback_after_survey' : 'feedback')
  }

  const maybeShowPrompt = () => {
    if (prompt) return
    if (shouldShowAcquisitionSurvey()) {
      const showCount = markAcquisitionSurveyShown()
      trackEvent('acquisition_survey_shown', { exportType, year, showCount })
      setPrompt('survey')
    } else if (shouldShowFeedbackPrompt()) {
      showFeedbackPrompt(false)
    }
  }

  const handleSurveyAnswered = () => {
    if (shouldShowFeedbackPrompt()) showFeedbackPrompt(true)
  }

  const handleDownload = async () => {
    if (!imageDataUrl) return

    const isMobileOrTablet = /Mobi|Android|iPad|iPhone|iPod/i.test(
      navigator.userAgent
    )

    trackEvent('image_download_click', {
      exportType,
      ...summarizeCalendar(calendarData, year),
      format,
    })

    if (isMobileOrTablet && !!navigator.share) {
      const blob = await fetch(imageDataUrl).then((r) => r.blob())
      const file = new File([blob], filename, { type: blob.type })

      navigator.share({
        files: [file],
        title: 'My trips this year',
        text: buildShareText(
          process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
        ),
      })
    } else {
      const link = document.createElement('a')
      link.download = filename
      link.href = imageDataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    maybeShowPrompt()
  }

  return (
    <div className="grid md:grid-cols-2 gap-0">
      <div className="order-2 md:order-1 bg-linear-to-br from-gray-50 to-stone-50 dark:bg-none dark:bg-[#111111] p-4 md:p-12 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-md"
        >
          {imageDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageDataUrl}
              alt="Your Yearly calendar"
              className={cn(
                'w-full rounded-lg shadow-2xl transition-opacity',
                isRendering && 'opacity-40'
              )}
            />
          )}
          {isRendering && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="size-8 animate-spin text-gray-600 dark:text-zinc-400" />
            </div>
          )}
        </motion.div>
      </div>

      <div className="order-1 md:order-2 p-6 md:p-12 flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="mb-4 md:mb-8">
            <h2 className="text-gray-900 dark:text-zinc-100 mb-2 md:mb-3 text-2xl md:text-3xl font-serif font-normal leading-tight">
              Your Yearly is ready! 🎉
            </h2>
            <p className="text-gray-600 dark:text-zinc-400 leading-relaxed text-sm md:text-base">
              Share your year-in-review with the world. Download the
              high-quality image or share directly to your favorite social
              platforms.
            </p>
          </div>

          <FormatPicker
            format={format}
            disabled={isRendering}
            onChange={onFormatChange}
          />

          <Button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full mb-4"
            onClick={handleDownload}
            disabled={isRendering}
          >
            <Download className="w-5 h-5" />
            Download Image
          </Button>

          {prompt === 'survey' && (
            <div className="mb-4">
              <AcquisitionSurvey
                onAnswered={handleSurveyAnswered}
                onDismiss={() => setPrompt('closed')}
              />
            </div>
          )}

          {(prompt === 'feedback' || prompt === 'feedback_after_survey') && (
            <div className="mb-4">
              <FeedbackPrompt
                source="post_export"
                context={{ exportType, year }}
                {...(prompt === 'feedback_after_survey' && {
                  title: 'Thanks! One more tap: enjoying Yearly?',
                  description:
                    'Your rating helps us decide what to build next.',
                  expandIn: false,
                })}
                onDismiss={() => setPrompt('closed')}
              />
            </div>
          )}

          {showVideoOffer && (
            <button
              type="button"
              onClick={openVideoPreview}
              className="group mb-4 flex w-full cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-left transition-colors hover:bg-gray-50 dark:border-white/8 dark:bg-white/5 dark:hover:bg-white/8"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-gray-900 text-white dark:bg-zinc-100 dark:text-gray-900">
                <Play className="size-4 fill-current" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-zinc-100">
                  Make it a video
                  <span className="rounded-full bg-red-500/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-red-600 uppercase dark:text-red-400">
                    New
                  </span>
                </span>
                <span className="block text-xs text-gray-600 dark:text-zinc-400">
                  {VIDEO_OFFER_COPY[exportType]} Preview it free.
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-gray-400 transition-transform group-hover:translate-x-0.5 dark:text-zinc-500" />
            </button>
          )}

          {videoPrice !== null && (
            <AnimatedVideoDialog
              open={videoOpen}
              onOpenChange={setVideoOpen}
              calendarData={calendarData}
              year={year}
              month={month}
              exportType={exportType}
              price={videoPrice}
            />
          )}

          <YearEndReminderCard year={year} />

          <div className="hidden md:block bg-gray-50 dark:bg-white/5 rounded-lg p-4 border border-gray-200 dark:border-white/8">
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              <span className="font-medium text-gray-900 dark:text-zinc-100">
                Pro tip:
              </span>{' '}
              Tag us{' '}
              <Link
                href="https://www.instagram.com/yearly.world"
                target="blank"
              >
                @yearly.world
              </Link>{' '}
              when you share, and we&apos;ll feature your travel story!
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function ImagePreviewModal({
  open,
  onOpenChange,
  ...contentProps
}: ImagePreviewModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl max-h-[80vh] p-0 gap-0 overflow-auto scrollbar-hide bg-white dark:bg-[#141414] border dark:border-white/8 shadow-stone-900">
        <DialogTitle className="sr-only">
          Export Your Yearly Calendar
        </DialogTitle>
        <DialogDescription className="sr-only">
          Download or share your travel calendar to social media platforms
        </DialogDescription>

        <ImagePreviewContent {...contentProps} />
      </DialogContent>
    </Dialog>
  )
}
