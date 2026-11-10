'use client'

import { AnimatedSection } from '@/components/AnimatedSection'
import { TrackingLink } from '@/components/HomepageClient'
import { useResolvedColorScheme } from '@/lib/hooks/useResolvedColorScheme'
import { VIDEO_LAUNCH_LABEL } from '@/lib/video-offer'
import { ArrowRight, Sparkles } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'

const HomepageVideoPlayer = dynamic(() => import('./HomepageVideoPlayer'), {
  ssr: false,
})

function useNearViewport() {
  const ref = useRef<HTMLElement>(null)
  const [isNear, setIsNear] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || isNear) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsNear(true)
      },
      { rootMargin: '300px' }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [isNear])

  return { ref, isNear }
}

export function HomepageVideoTeaser() {
  const colorScheme = useResolvedColorScheme()
  const { ref, isNear } = useNearViewport()

  return (
    <section className="pb-24" aria-labelledby="video-teaser-heading">
      <AnimatedSection
        animation="fadeInUpOnView"
        className="mx-auto grid max-w-4xl items-center gap-8 rounded-3xl border border-gray-200 bg-white p-6 shadow-lg md:grid-cols-[minmax(0,260px)_1fr] md:gap-12 md:p-10 dark:border-white/8 dark:bg-[#141414] dark:shadow-[0_0_40px_rgba(255,255,255,0.06)]"
      >
        <figure
          ref={ref}
          aria-label="An example video: a 2026 travel calendar filling up with flags, day by day"
          className="mx-auto aspect-9/16 w-full max-w-60 overflow-hidden rounded-2xl border border-gray-200 bg-white md:max-w-none dark:border-white/8 dark:bg-black"
        >
          {isNear && colorScheme && <HomepageVideoPlayer theme={colorScheme} />}
        </figure>

        <div className="text-center md:text-left">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-400">
            <Sparkles className="size-3.5" />
            Coming in {VIDEO_LAUNCH_LABEL}
          </span>
          <h2
            id="video-teaser-heading"
            className="mb-3 font-serif text-3xl font-normal text-gray-900 md:text-4xl dark:text-zinc-100"
          >
            Your year, animated
          </h2>
          <p className="mb-6 text-lg leading-relaxed text-gray-600 dark:text-zinc-400">
            Watch your calendar fill up flag by flag, then your stats count up.
            A short video made from your own trips, for Reels, Stories and
            TikTok.
          </p>
          <TrackingLink
            href="/create"
            linkType="video_teaser"
            className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-white shadow-lg transition-all hover:scale-105 hover:bg-gray-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Add your trips to preview yours
            <ArrowRight className="size-4" />
          </TrackingLink>
          <p className="mt-3 text-sm text-gray-500 dark:text-zinc-500">
            The preview is free, and your images stay free.
          </p>
        </div>
      </AnimatedSection>
    </section>
  )
}
