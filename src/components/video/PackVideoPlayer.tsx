'use client'

import type { VideoSummary } from '@/lib/videos/client'
import { Play } from 'lucide-react'
import { useRef, useState } from 'react'

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
  const videoRef = useRef<HTMLVideoElement>(null)
  const retriedRef = useRef<string | null>(null)
  const key = `${video.kind}-${video.theme}`
  const [startedKey, setStartedKey] = useState<string | null>(null)
  const started = autoPlay || startedKey === key

  const handleError = () => {
    if (!onExpired || retriedRef.current === key) return
    retriedRef.current = key
    onExpired()
  }

  return (
    <div className="relative size-full">
      <video
        ref={videoRef}
        key={key}
        src={video.url}
        poster={video.posterUrl ?? undefined}
        aria-label={`${KIND_LABELS[video.kind]}, ${video.theme}`}
        playsInline
        muted
        loop
        controls={started}
        autoPlay={autoPlay}
        preload={preload}
        onPlay={() => setStartedKey(key)}
        onError={handleError}
        className="size-full bg-black object-cover"
      />
      {!started && (
        <button
          type="button"
          onClick={() => void videoRef.current?.play()}
          className="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/10 transition-colors hover:bg-black/20"
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-white/90 text-gray-900 shadow-lg">
            <Play className="size-4 translate-x-px fill-current" />
          </span>
          <span className="sr-only">Play {KIND_LABELS[video.kind]}</span>
        </button>
      )}
    </div>
  )
}
