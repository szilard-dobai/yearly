'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { Download } from 'lucide-react'
import { motion } from 'motion/react'
import Link from 'next/link'
import { Button } from './ui/button'

interface ImagePreviewModalProps {
  open: boolean
  imageDataUrl: string | null
  filename: string
  onOpenChange: (open: boolean) => void
}

export default function ImagePreviewModal({
  open,
  imageDataUrl,
  filename,
  onOpenChange,
}: ImagePreviewModalProps) {
  const handleDownload = async () => {
    if (!imageDataUrl) return

    if (navigator.share) {
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
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-5xl max-h-[80vh] p-0 gap-0 overflow-scroll bg-white dark:bg-black border-0">
        <DialogTitle className="sr-only">
          Export Your Yearly Calendar
        </DialogTitle>
        <DialogDescription className="sr-only">
          Download or share your travel calendar to social media platforms
        </DialogDescription>

        <div className="grid md:grid-cols-2 gap-0">
          <div className="bg-linear-to-br from-gray-50 to-stone-50 dark:bg-none dark:bg-neutral-900 p-8 md:p-12 flex items-center justify-center">
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

          <div className="p-8 md:p-12 flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div className="mb-8">
                <h2
                  className="text-gray-900 dark:text-white mb-3"
                  style={{
                    fontSize: '2rem',
                    fontFamily: 'Newsreader, serif',
                    fontWeight: '400',
                    lineHeight: '1.2',
                  }}
                >
                  Your Yearly is ready! 🎉
                </h2>
                <p
                  className="text-gray-600 dark:text-gray-400"
                  style={{ lineHeight: '1.7' }}
                >
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
                <span style={{ fontWeight: '500' }}>Download Image</span>
              </Button>

              <div className="bg-gray-50 dark:bg-neutral-900 rounded-lg p-4 border border-gray-200 dark:border-white/10">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span
                    style={{ fontWeight: '500' }}
                    className="text-gray-900 dark:text-white"
                  >
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
      </DialogContent>
    </Dialog>
  )
}
