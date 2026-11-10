'use client'

import ChoiceChip from '@/components/ChoiceChip'
import StarRating from '@/components/StarRating'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { submitFeedback, updateFeedback } from '@/lib/feedback/client'
import { markFeedbackPromptDismissed } from '@/lib/feedback/prompt'
import {
  FEEDBACK_MESSAGE_MAX_LENGTH,
  FEEDBACK_TAG_LABELS,
  getFeedbackTagsForRating,
  type FeedbackContext,
  type FeedbackSource,
  type FeedbackTag,
} from '@/lib/feedback/types'
import { trackEvent } from '@/lib/tracking'
import { cn } from '@/lib/utils'
import { Check, Loader2, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useId, useRef, useState } from 'react'

interface FeedbackPromptProps {
  source: FeedbackSource
  context?: FeedbackContext
  title?: string
  description?: string
  expandIn?: boolean
  className?: string
  onRate?: () => void
  onDismiss: () => void
}

type Step = 'rate' | 'comment' | 'done'

const stepTransition = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.2 },
}

const FOLLOW_UP_COPY = {
  low: {
    question: 'Sorry to hear that. What went wrong?',
    placeholder: 'Tell us a bit more (optional)',
  },
  high: {
    question: 'Glad you like it! What stood out?',
    placeholder: 'Anything we could add or improve? (optional)',
  },
}

export default function FeedbackPrompt({
  source,
  context,
  title = 'Enjoying Yearly?',
  description = 'Rate your experience — it takes one tap.',
  expandIn = true,
  className,
  onRate,
  onDismiss,
}: FeedbackPromptProps) {
  const [step, setStep] = useState<Step>('rate')
  const [rating, setRating] = useState<number | null>(null)
  const [tags, setTags] = useState<FeedbackTag[]>([])
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const ratingRequest = useRef<Promise<{ id: string } | null> | null>(null)
  const questionId = useId()

  const hasDetails = tags.length > 0 || message.trim().length > 0

  const handleRate = (value: number) => {
    onRate?.()
    setRating(value)
    setTags([])
    setStep('comment')
    setError('')
    ratingRequest.current = submitFeedback({
      rating: value,
      message: null,
      source,
      context,
    }).catch(() => null)
  }

  const handleDismiss = () => {
    markFeedbackPromptDismissed()
    trackEvent('feedback_prompt_dismissed', { ...context, source })
    onDismiss()
  }

  const toggleTag = (tag: FeedbackTag) => {
    setTags((current) =>
      current.includes(tag)
        ? current.filter((selected) => selected !== tag)
        : [...current, tag]
    )
  }

  const handleSkip = () => {
    setStep('done')
    const pendingRating = rating
    ratingRequest.current?.then((saved) => {
      if (!saved && pendingRating !== null) {
        submitFeedback({
          rating: pendingRating,
          message: null,
          source,
          context,
        }).catch(() => {})
      }
    })
  }

  const handleSend = async () => {
    if (!hasDetails || rating === null) return

    setIsSending(true)
    setError('')
    try {
      const saved = await ratingRequest.current
      if (saved) {
        await updateFeedback(saved.id, { message, tags })
      } else {
        await submitFeedback({ rating, message, tags, source, context })
      }
      setStep('done')
    } catch {
      setError("Couldn't send your message. Please try again.")
    } finally {
      setIsSending(false)
    }
  }

  const followUp =
    rating !== null && rating <= 3 ? FOLLOW_UP_COPY.low : FOLLOW_UP_COPY.high

  return (
    <motion.div
      initial={expandIn ? { opacity: 0, height: 0 } : { opacity: 0 }}
      animate={expandIn ? { opacity: 1, height: 'auto' } : { opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <section
        aria-label="Rate your experience"
        className={cn(
          'relative rounded-lg border border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-white/5 p-4',
          className
        )}
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
                {title}
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3">
                {description}
              </p>
              <StarRating
                value={rating}
                onChange={handleRate}
                label="Rate your experience with Yearly"
                showHint
              />
            </motion.div>
          )}

          {step === 'comment' && rating !== null && (
            <motion.div key="comment" {...stepTransition} className="space-y-3">
              <div className="flex items-center gap-2">
                <StarRating value={rating} size="sm" />
                <span className="text-xs font-medium text-gray-500 dark:text-zinc-400">
                  Thanks for rating!
                </span>
              </div>
              <p
                id={questionId}
                className="text-sm font-medium text-gray-900 dark:text-zinc-100"
              >
                {followUp.question}
              </p>
              <div
                role="group"
                aria-labelledby={questionId}
                className="flex flex-wrap gap-1.5"
              >
                {getFeedbackTagsForRating(rating).map((tag) => {
                  const selected = tags.includes(tag)
                  return (
                    <ChoiceChip
                      key={tag}
                      selected={selected}
                      aria-pressed={selected}
                      onClick={() => toggleTag(tag)}
                    >
                      {selected && <Check aria-hidden className="size-3" />}
                      {FEEDBACK_TAG_LABELS[tag]}
                    </ChoiceChip>
                  )
                })}
              </div>
              <Textarea
                aria-label={followUp.placeholder}
                rows={2}
                value={message}
                maxLength={FEEDBACK_MESSAGE_MAX_LENGTH}
                onChange={(event) => setMessage(event.target.value)}
                placeholder={followUp.placeholder}
                className="min-h-16 bg-white dark:bg-[#141414]"
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
                  disabled={!hasDetails || isSending}
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
