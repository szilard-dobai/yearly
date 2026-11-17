'use client'

import { cn } from '@/lib/utils'
import { VIDEO_LAUNCH_LABEL } from '@/lib/video-offer'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface VideoWaitlistJoinedProps {
  className?: string
  onLeave?: () => Promise<void>
}

export function VideoWaitlistJoined({
  className,
  onLeave,
}: VideoWaitlistJoinedProps) {
  const [isLeaving, setIsLeaving] = useState(false)
  const [failed, setFailed] = useState(false)

  const handleLeave = async () => {
    if (!onLeave) return
    setIsLeaving(true)
    setFailed(false)
    try {
      await onLeave()
    } catch {
      setFailed(true)
      setIsLeaving(false)
    }
  }

  return (
    <div className={cn('flex items-start gap-3', className)}>
      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-500" />
      <div className="min-w-0">
        <p role="status">
          <span className="font-medium text-gray-900 dark:text-zinc-100">
            You&apos;re on the list.
          </span>{' '}
          We&apos;ll email you when videos launch in {VIDEO_LAUNCH_LABEL}. Your
          first video is free.
        </p>
        {onLeave && (
          <button
            type="button"
            onClick={handleLeave}
            disabled={isLeaving}
            className="mt-2 inline-flex cursor-pointer items-center gap-1.5 text-xs text-gray-500 underline underline-offset-2 hover:text-gray-900 disabled:cursor-default disabled:opacity-60 dark:text-zinc-500 dark:hover:text-zinc-100"
          >
            {isLeaving && <Loader2 className="size-3 animate-spin" />}
            Remove me from the list
          </button>
        )}
        {failed && (
          <p
            role="alert"
            className="mt-1 text-xs text-red-600 dark:text-red-400"
          >
            We couldn&apos;t remove you. Please try again.
          </p>
        )}
      </div>
    </div>
  )
}
