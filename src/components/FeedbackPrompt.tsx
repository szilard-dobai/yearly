'use client'

import StarRating from '@/components/StarRating'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { submitFeedback, updateFeedback } from '@/lib/feedback/client'
import { markFeedbackPromptDismissed } from '@/lib/feedback/prompt'
import {
  FEEDBACK_MESSAGE_MAX_LENGTH,
  type FeedbackContext,
} from '@/lib/feedback/types'
import { trackEvent } from '@/lib/tracking'
import { Loader2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useRef, useState } from 'react'

interface FeedbackPromptProps {
  context: FeedbackContext
  onDismiss: () => void
}

type Step = 'rate' | 'comment' | 'done'

const stepTransition = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.2 },
}

export default function FeedbackPrompt({
  context,
  onDismiss,
}: FeedbackPromptProps) {
  const [step, setStep] = useState<Step>('rate')
  const [rating, setRating] = useState<number | null>(null)
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const ratingRequest = useRef<Promise<{ id: string } | null> | null>(null)

  const handleRate = (value: number) => {
    setRating(value)
    setStep('comment')
    setError('')
    ratingRequest.current = submitFeedback({
      rating: value,
      message: null,
      source: 'post_export',
      context,
    }).catch(() => null)
  }

  const handleDismiss = () => {
    markFeedbackPromptDismissed()
    trackEvent('feedback_prompt_dismissed', context)
    onDismiss()
  }

  const handleSkip = () => {
    setStep('done')
    const pendingRating = rating
    ratingRequest.current?.then((saved) => {
      if (!saved && pendingRating !== null) {
        submitFeedback({
          rating: pendingRating,
          message: null,
          source: 'post_export',
          context,
        }).catch(() => {})
      }
    })
  }

  const handleSend = async () => {
    if (!message.trim() || rating === null) return

    setIsSending(true)
    setError('')
    try {
      const saved = await ratingRequest.current
      if (saved) {
        await updateFeedback(saved.id, { message })
      } else {
        await submitFeedback({
          rating,
          message,
          source: 'post_export',
          context,
        })
      }
      setStep('done')
    } catch {
      setError("Couldn't send your message. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  const followUpQuestion =
    rating !== null && rating <= 3
      ? 'Sorry to hear that. What could we do better?'
      : 'Glad you like it! Anything we could add or improve?'

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <section
        aria-label="Rate your experience"
        className="relative rounded-lg border border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-white/5 p-4"
      >
        <AnimatePresence mode="wait" initial={false}>
          {step === 'rate' && (
            <motion.div key="rate" {...stepTransition}>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss feedback prompt"
                className="absolute top-2.5 right-2.5 rounded-md p-1 text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer transition-colors"
              >
                <X className="size-4" />
              </button>
              <p className="text-sm font-medium text-gray-900 dark:text-zinc-100 pr-6">
                Enjoying Yearly?
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3">
                Rate your experience — it takes one tap.
              </p>
              <StarRating
                value={rating}
                onChange={handleRate}
                label="Rate your experience with Yearly"
                showHint
              />
            </motion.div>
          )}

          {step === 'comment' && (
            <motion.div key="comment" {...stepTransition} className="space-y-3">
              <div className="flex items-center gap-2">
                <StarRating value={rating} size="sm" />
                <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                  Thanks for rating!
                </span>
              </div>
              <label
                htmlFor="feedback-prompt-message"
                className="block text-sm font-medium text-gray-900 dark:text-zinc-100"
              >
                {followUpQuestion}
              </label>
              <Textarea
                id="feedback-prompt-message"
                rows={3}
                value={message}
                maxLength={FEEDBACK_MESSAGE_MAX_LENGTH}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Optional — tell us in a few words"
                className="bg-white dark:bg-[#141414]"
              />
              {error && (
                <p
                  role="alert"
                  className="text-xs text-red-600 dark:text-red-400"
                >
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSkip}
                  disabled={isSending}
                >
                  Skip
                </Button>
                <Button
                  size="sm"
                  onClick={handleSend}
                  disabled={!message.trim() || isSending}
                >
                  {isSending && <Loader2 className="size-4 animate-spin" />}
                  Send
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'done' && (
            <motion.p
              key="done"
              {...stepTransition}
              role="status"
              className="text-sm text-gray-700 dark:text-zinc-300"
            >
              <span className="font-medium text-gray-900 dark:text-zinc-100">
                Thanks for the feedback! 🙌
              </span>{' '}
              It helps us make Yearly better.
            </motion.p>
          )}
        </AnimatePresence>
      </section>
    </motion.div>
  )
}
