'use client'

import { Button } from '@/components/ui/button'
import type { Badge } from '@/lib/badges'
import { useSettings } from '@/lib/contexts/SettingsContext'
import { buildShareText } from '@/lib/share'
import { trackEvent } from '@/lib/tracking'
import type { DayMap } from '@/lib/trips'
import { cn } from '@/lib/utils'
import type { YearSummary } from '@/lib/year-summary'
import { Download, RotateCcw, Share2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { buildSlides } from './WrappedSlides'

export const SLIDE_MS = 5000

interface WrappedStoryProps {
  open: boolean
  onClose: () => void
  summary: YearSummary
  dayMap: DayMap
  badges: Badge[]
  onDownloadCalendar: () => void
}

export default function WrappedStory({
  open,
  onClose,
  summary,
  dayMap,
  badges,
  onDownloadCalendar,
}: WrappedStoryProps) {
  const { settings } = useSettings()
  const [index, setIndex] = useState(0)
  const [run, setRun] = useState(0)
  const [paused, setPaused] = useState(false)
  const [copied, setCopied] = useState(false)
  const completed = useRef(false)

  const replay = useCallback(() => {
    setIndex(0)
    setRun((r) => r + 1)
  }, [])

  const share = async () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    const text = `My ${summary.year} in travel: ${summary.countries.length} countries, ${summary.days} days abroad. ${buildShareText(siteUrl)}`
    if (navigator.share) {
      try {
        await navigator.share({ title: `My ${summary.year} in travel`, text })
        trackEvent('wrapped_share', { year: summary.year, method: 'native' })
      } catch {
        // The share sheet was closed without sharing
      }
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      trackEvent('wrapped_share', { year: summary.year, method: 'clipboard' })
    } catch {
      setCopied(false)
    }
  }

  const outro = (
    <div className="flex h-full flex-col justify-between">
      <p className="text-xs font-medium uppercase tracking-[0.25em] opacity-60">
        Yearly
      </p>
      <div>
        <p className="font-serif text-5xl leading-tight">
          That was {summary.year}.
        </p>
        <p className="mt-3 text-lg opacity-70">
          {summary.countries.length}{' '}
          {summary.countries.length === 1 ? 'country' : 'countries'} ·{' '}
          {summary.days} {summary.days === 1 ? 'day' : 'days'} ·{' '}
          {summary.trips.length} {summary.trips.length === 1 ? 'trip' : 'trips'}
        </p>
      </div>
      <div className="relative z-20 space-y-2.5">
        <Button
          size="lg"
          className="w-full bg-white text-black hover:bg-gray-200 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          onClick={share}
        >
          <Share2 />
          {copied ? 'Copied, paste it anywhere' : `Share my ${summary.year}`}
        </Button>
        <div className="grid grid-cols-2 gap-2.5">
          <Button
            variant="outline"
            className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white dark:border-white/20 dark:bg-transparent dark:hover:bg-white/10"
            onClick={() => {
              onClose()
              onDownloadCalendar()
            }}
          >
            <Download />
            Calendar image
          </Button>
          <Button
            variant="outline"
            className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white dark:border-white/20 dark:bg-transparent dark:hover:bg-white/10"
            onClick={replay}
          >
            <RotateCcw />
            Replay
          </Button>
        </div>
        <p className="pt-2 text-center text-[10px] tracking-wide opacity-50">
          made with yearly.world
        </p>
      </div>
    </div>
  )

  const slides = buildSlides({
    summary,
    dayMap,
    badges,
    flagMode: settings.flagDisplayMode,
    outro,
  })
  const slide = slides[Math.min(index, slides.length - 1)]
  const isLast = index >= slides.length - 1

  const next = useCallback(
    () => setIndex((i) => Math.min(i + 1, slides.length - 1)),
    [slides.length]
  )
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), [])

  useEffect(() => {
    if (!open || !isLast || completed.current) return
    completed.current = true
    trackEvent('wrapped_complete', {
      year: summary.year,
      slides: slides.length,
    })
  }, [open, isLast, summary.year, slides.length])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === ' ') next()
      if (event.key === 'ArrowLeft') prev()
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open, next, prev, onClose])

  return (
    <AnimatePresence
      onExitComplete={() => {
        setIndex(0)
        setCopied(false)
        completed.current = false
      }}
    >
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Your ${summary.year} in travel`}
        >
          <style>{`@keyframes wrapped-fill { from { transform: scaleX(0) } to { transform: scaleX(1) } }`}</style>
          <div
            className={cn(
              'relative h-full w-full overflow-hidden transition-colors duration-500 select-none sm:aspect-9/16 sm:h-[min(860px,100%)] sm:w-auto sm:rounded-2xl',
              slide.theme === 'dark'
                ? 'bg-black text-white'
                : 'bg-white text-black'
            )}
            onPointerDown={() => setPaused(true)}
            onPointerUp={() => setPaused(false)}
            onPointerCancel={() => setPaused(false)}
          >
            <div className="absolute inset-x-3 top-3 z-30 flex gap-1">
              {slides.map((s, i) => (
                <div
                  key={s.id}
                  className={cn(
                    'h-[3px] flex-1 overflow-hidden rounded-full',
                    slide.theme === 'dark' ? 'bg-white/25' : 'bg-black/15'
                  )}
                >
                  <div
                    key={i === index ? `${run}-${index}` : 'idle'}
                    className={cn(
                      'h-full origin-left rounded-full',
                      slide.theme === 'dark' ? 'bg-white' : 'bg-black'
                    )}
                    style={
                      i < index
                        ? { transform: 'scaleX(1)' }
                        : i === index
                          ? {
                              animation: `wrapped-fill ${SLIDE_MS}ms linear forwards`,
                              animationPlayState: paused ? 'paused' : 'running',
                            }
                          : { transform: 'scaleX(0)' }
                    }
                    onAnimationEnd={() => !isLast && next()}
                  />
                </div>
              ))}
            </div>

            <button
              type="button"
              aria-label="Close"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={onClose}
              className={cn(
                'absolute top-6 right-3 z-30 cursor-pointer rounded-full p-2',
                slide.theme === 'dark'
                  ? 'hover:bg-white/10'
                  : 'hover:bg-black/5'
              )}
            >
              <X className="size-5" />
            </button>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${run}-${slide.id}`}
                className="absolute inset-0 px-7 pt-16 pb-8"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                {slide.content}
              </motion.div>
            </AnimatePresence>

            {!isLast && (
              <>
                <button
                  type="button"
                  aria-label="Previous"
                  className="absolute inset-y-0 left-0 z-20 w-1/3 cursor-w-resize"
                  onClick={prev}
                />
                <button
                  type="button"
                  aria-label="Next"
                  className="absolute inset-y-0 right-0 z-20 w-2/3 cursor-e-resize"
                  onClick={next}
                />
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
