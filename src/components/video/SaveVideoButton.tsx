'use client'

import { Button } from '@/components/ui/button'
import { trackEvent } from '@/lib/tracking'
import type { OrderSummary, VideoSummary } from '@/lib/videos/client'
import {
  downloadFile,
  fetchVideoFile,
  type SaveMethod,
  saveMethod,
  shareFile,
  videoFilename,
} from '@/lib/videos/save'
import { Download, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

type Notice = { key: string; type: 'tap-again' | 'error' }

interface SaveVideoButtonProps {
  order: OrderSummary
  video: VideoSummary
  freshOrder: () => Promise<OrderSummary | null>
  source: 'dialog' | 'account'
  className?: string
}

const subscribeNothing = () => () => {}

function useSaveMethod(): SaveMethod | null {
  return useSyncExternalStore(subscribeNothing, saveMethod, () => null)
}

function fileKey(order: OrderSummary, video: VideoSummary) {
  return `${order.id}:${order.render?.version}:${video.kind}:${video.theme}`
}

export default function SaveVideoButton({
  order,
  video,
  freshOrder,
  source,
  className,
}: SaveVideoButtonProps) {
  const method = useSaveMethod()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice | null>(null)
  const filesRef = useRef(new Map<string, Promise<File>>())
  const key = fileKey(order, video)
  const filename = videoFilename(order, video)

  const loadFile = (fileKeyToLoad: string, url: string) => {
    const cached = filesRef.current.get(fileKeyToLoad)
    if (cached) return cached
    const loading = fetchVideoFile(url, filename)
    filesRef.current.set(fileKeyToLoad, loading)
    loading.catch(() => filesRef.current.delete(fileKeyToLoad))
    return loading
  }

  useEffect(() => {
    if (method !== 'share' || filesRef.current.has(key)) return
    const loading = fetchVideoFile(video.url, filename)
    filesRef.current.set(key, loading)
    loading.catch(() => filesRef.current.delete(key))
  }, [method, key, video.url, filename])

  const handleSave = async () => {
    const chosen = method ?? saveMethod()
    setNotice(null)
    setBusy(true)
    try {
      let loading = filesRef.current.get(key)
      if (!loading) {
        const current = await freshOrder()
        const url =
          current?.videos.find(
            (item) => item.kind === video.kind && item.theme === video.theme
          )?.url ?? video.url
        loading = loadFile(key, url)
      }
      const file = await loading
      let saved: SaveMethod | null = 'download'
      if (chosen === 'share') {
        const outcome = await shareFile(file)
        if (outcome === 'shared') saved = 'share'
        else if (outcome === 'unsupported') downloadFile(file)
        else {
          saved = null
          if (outcome === 'blocked') setNotice({ key, type: 'tap-again' })
        }
      } else {
        downloadFile(file)
      }
      if (saved) {
        trackEvent('animated_video_saved', {
          pack: order.pack,
          videoKind: video.kind,
          theme: video.theme,
          method: saved,
          source,
        })
      }
    } catch (error) {
      console.error('Failed to save the video:', error)
      setNotice({ key, type: 'error' })
    } finally {
      setBusy(false)
    }
  }

  const shown = notice?.key === key ? notice.type : null

  return (
    <div className={className}>
      <Button size="lg" className="w-full" onClick={handleSave} disabled={busy}>
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Download className="size-4" />
        )}
        Save video
      </Button>
      {shown && (
        <p
          role={shown === 'error' ? 'alert' : 'status'}
          className="mt-2 text-center text-xs text-gray-600 dark:text-zinc-400"
        >
          {shown === 'error'
            ? "We couldn't save the video. Try again."
            : 'Your video is ready. Tap Save video again.'}
        </p>
      )}
    </div>
  )
}
