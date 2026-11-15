'use client'

import type { VideoSummary } from '@/lib/videos/client'
import { useRef } from 'react'

const KIND_LABELS: Record<VideoSummary['kind'], string> = {
  year: 'Your year video',
  stats: 'Your stats video',
  month: 'Your month video',
}

export default function PackVideoPlayer({
  video,
  autoPlay = false,
  preload = 'metadata',
  onExpired,
}: {
  video: VideoSummary
  autoPlay?: boolean
  preload?: 'auto' | 'metadata'
  onExpired?: () => void
}) {
  const retriedRef = useRef<string | null>(null)

  const handleError = () => {
    const key = `${video.kind}-${video.theme}`
    if (!onExpired || retriedRef.current === key) return
    retriedRef.current = key
    onExpired()
  }

  return (
    <video
      key={`${video.kind}-${video.theme}`}
      src={video.url}
      poster={video.posterUrl ?? undefined}
      aria-label={`${KIND_LABELS[video.kind]}, ${video.theme}`}
      playsInline
      muted
      loop
      controls
      autoPlay={autoPlay}
      preload={preload}
      onError={handleError}
      className="size-full bg-black object-cover"
    />
  )
}
