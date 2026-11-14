'use client'

import { HomepageExampleImage } from '@/components/HomepageExampleImage'
import type { HomepageExample } from '@/lib/homepage-examples'
import {
  useNearViewport,
  usePreloadWhenIdle,
} from '@/lib/hooks/useNearViewport'
import { useResolvedColorScheme } from '@/lib/hooks/useResolvedColorScheme'
import { cn } from '@/lib/utils'
import type { VideoKind } from '@/lib/video'
import dynamic from 'next/dynamic'

const loadPlayer = () => import('./HomepageVideoPlayer')

const HomepageVideoPlayer = dynamic(loadPlayer, { ssr: false })

export function ExampleVideo({
  kind,
  poster,
  label,
  className,
}: {
  kind: VideoKind
  poster: HomepageExample
  label: string
  className?: string
}) {
  const colorScheme = useResolvedColorScheme()
  const { ref, isNear } = useNearViewport<HTMLElement>()
  usePreloadWhenIdle(loadPlayer)

  return (
    <figure
      ref={ref}
      aria-label={label}
      className={cn(
        'relative aspect-9/16 w-full overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-white/8 dark:bg-black',
        className
      )}
    >
      <HomepageExampleImage example={poster} />
      {isNear && colorScheme && (
        <div className="absolute inset-0">
          <HomepageVideoPlayer kind={kind} theme={colorScheme} />
        </div>
      )}
    </figure>
  )
}
