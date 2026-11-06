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
import { Loader2, Trash2 } from 'lucide-react'
import { type ReactNode, useState } from 'react'

interface ConfirmDeleteButtonProps {
  label: string
  title: string
  description: ReactNode
  confirmLabel: string
  onConfirm: () => Promise<void>
}

export default function ConfirmDeleteButton({
  label,
  title,
  description,
  confirmLabel,
  onConfirm,
}: ConfirmDeleteButtonProps) {
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleOpenChange = (nextOpen: boolean) => {
    if (isDeleting) return
    setOpen(nextOpen)
    setError('')
  }

  const handleConfirm = async () => {
    setIsDeleting(true)
    setError('')
    try {
      await onConfirm()
      setOpen(false)
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : 'Failed to delete'
      )
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-500/20 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
        >
          <Trash2 className="size-4" />
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        onOverlayClick={() => handleOpenChange(false)}
        className="dark:bg-[#141414] dark:border-white/8"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
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
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isDeleting}
          >
            {isDeleting && <Loader2 className="size-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
