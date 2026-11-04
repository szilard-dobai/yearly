'use client'

import StarRating from '@/components/StarRating'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitFeedback } from '@/lib/feedback/client'
import {
  FEEDBACK_MESSAGE_MAX_LENGTH,
  type FeedbackSource,
} from '@/lib/feedback/types'
import { CheckCircle2, Loader2, Send } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'

interface FeedbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  source: FeedbackSource
}

type FormStatus = 'idle' | 'submitting' | 'success' | 'error'

function FeedbackForm({
  source,
  onClose,
}: {
  source: FeedbackSource
  onClose: () => void
}) {
  const [rating, setRating] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<FormStatus>('idle')
  const [error, setError] = useState('')

  const canSubmit =
    (rating !== null || message.trim().length > 0) && status !== 'submitting'

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return

    setStatus('submitting')
    setError('')
    try {
      await submitFeedback({ rating, message, source })
      setStatus('success')
    } catch (submitError) {
      setStatus('error')
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Failed to send feedback'
      )
    }
  }

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center py-6 gap-3"
      >
        <div className="size-14 rounded-full bg-green-50 dark:bg-green-500/10 flex items-center justify-center">
          <CheckCircle2 className="size-7 text-green-600 dark:text-green-400" />
        </div>
        <DialogTitle className="text-2xl font-serif font-normal text-gray-900 dark:text-zinc-100">
          Thank you!
        </DialogTitle>
        <DialogDescription className="text-gray-600 dark:text-zinc-400 max-w-xs">
          Your feedback helps shape what we build next.
        </DialogDescription>
        <Button className="mt-2 min-w-32" onClick={onClose}>
          Close
        </Button>
      </motion.div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <span className="text-2xl">💬</span>
          Share your feedback
        </DialogTitle>
        <DialogDescription>
          Ideas, bugs, or things you love — we read every message.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-900 dark:text-zinc-100">
          How would you rate Yearly?{' '}
          <span className="font-normal text-gray-500 dark:text-zinc-500">
            (optional)
          </span>
        </p>
        <StarRating
          value={rating}
          onChange={setRating}
          size="lg"
          label="How would you rate Yearly?"
          showHint
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="feedback-message">Your feedback</Label>
        <Textarea
          id="feedback-message"
          rows={5}
          value={message}
          maxLength={FEEDBACK_MESSAGE_MAX_LENGTH}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="What should we add, fix, or improve?"
          className="min-h-28"
        />
        <p className="text-right text-xs text-gray-400 dark:text-zinc-500 tabular-nums">
          {message.length} / {FEEDBACK_MESSAGE_MAX_LENGTH}
        </p>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
        {status === 'submitting' ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Send className="size-4" />
            Send feedback
          </>
        )}
      </Button>
    </form>
  )
}

export default function FeedbackDialog({
  open,
  onOpenChange,
  source,
}: FeedbackDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-[#141414] dark:border-white/8">
        <FeedbackForm source={source} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
