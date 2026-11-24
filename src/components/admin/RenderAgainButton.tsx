'use client'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Loader2, RotateCcw } from 'lucide-react'
import { useState } from 'react'

export default function RenderAgainButton({
  version,
  onConfirm,
}: {
  version: number
  onConfirm: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState('')

  const handleOpenChange = (nextOpen: boolean) => {
    if (isStarting) return
    setOpen(nextOpen)
    setError('')
  }

  const handleConfirm = async () => {
    setIsStarting(true)
    setError('')
    try {
      await onConfirm()
      setOpen(false)
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : 'Failed to start the render'
      )
    } finally {
      setIsStarting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          <RotateCcw className="size-4" />
          Render again
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        onOverlayClick={() => handleOpenChange(false)}
        className="dark:bg-[#141414] dark:border-white/8"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>Render version {version} again?</AlertDialogTitle>
          <AlertDialogDescription>
            This starts a new render from the same trips. The buyer gets the
            &ldquo;Your videos are ready&rdquo; email when it finishes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isStarting}>Cancel</AlertDialogCancel>
          <Button onClick={handleConfirm} disabled={isStarting}>
            {isStarting && <Loader2 className="size-4 animate-spin" />}
            Render again
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
