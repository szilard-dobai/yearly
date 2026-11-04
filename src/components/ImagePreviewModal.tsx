'use client'

import FeedbackPrompt from '@/components/FeedbackPrompt'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  markFeedbackPromptShown,
  shouldShowFeedbackPrompt,
} from '@/lib/feedback/prompt'
import type { ExportType } from '@/lib/feedback/types'
import { trackEvent } from '@/lib/tracking'
import type { CalendarData } from '@/lib/types'
import { Download } from 'lucide-react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from './ui/button'

interface ImagePreviewModalProps {
  open: boolean
  imageDataUrl: string | null
  filename: string
  year: number
  calendarData: CalendarData
  exportType: ExportType
  onOpenChange: (open: boolean) => void
}

type ImagePreviewContentProps = Omit<
  ImagePreviewModalProps,
  'open' | 'onOpenChange'
>

function ImagePreviewContent({
  imageDataUrl,
  filename,
  year,
  calendarData,
  exportType,
}: ImagePreviewContentProps) {
  const [showFeedbackPrompt, setShowFeedbackPrompt] = useState(false)

  const maybeShowFeedbackPrompt = () => {
    if (showFeedbackPrompt || !shouldShowFeedbackPrompt()) return
    markFeedbackPromptShown()
    trackEvent('feedback_prompt_shown', { exportType, year })
    setShowFeedbackPrompt(true)
  }

  const handleDownload = async () => {
    if (!imageDataUrl) return

    const isMobileOrTablet = /Mobi|Android|iPad|iPhone|iPod/i.test(
      navigator.userAgent
    )

    trackEvent('image_download_click', {
      year,
      calendarData,
    })

    if (isMobileOrTablet && !!navigator.share) {
      const blob = await fetch(imageDataUrl).then((r) => r.blob())
      const file = new File([blob], filename, { type: blob.type })

      navigator.share({
        files: [file],
        title: 'My trips this year',
        text: 'Created by Yearly',
      })
    } else {
      const link = document.createElement('a')
      link.download = filename
      link.href = imageDataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }

    maybeShowFeedbackPrompt()
  }

  return (
    <div className="grid md:grid-cols-2 gap-0">
      <div className="order-2 md:order-1 bg-linear-to-br from-gray-50 to-stone-50 dark:bg-none dark:bg-[#111111] p-4 md:p-12 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          {imageDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageDataUrl}
              alt="Your Yearly calendar"
              className="w-full rounded-lg shadow-2xl"
            />
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

          <Button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full mb-4"
            onClick={handleDownload}
          >
            <Download className="w-5 h-5" />
            Download Image
          </Button>

          {showFeedbackPrompt && (
            <div className="mb-4">
              <FeedbackPrompt
                context={{ exportType, year }}
                onDismiss={() => setShowFeedbackPrompt(false)}
              />
            </div>
          )}

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
