'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  buildSurveyAnswer,
  markAcquisitionSurveyAnswered,
  markAcquisitionSurveyDismissed,
  SURVEY_ANSWERS,
  SURVEY_OTHER_TEXT_MAX_LENGTH,
  type SurveyAnswer,
} from '@/lib/attribution/survey'
import { trackEvent } from '@/lib/tracking'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'

interface AcquisitionSurveyProps {
  onDismiss: () => void
}

type Step = 'ask' | 'other' | 'done'

const stepTransition = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.2 },
}

const chipClassName =
  'cursor-pointer rounded-full border px-3 py-1.5 text-xs font-medium transition-colors'

export default function AcquisitionSurvey({
  onDismiss,
}: AcquisitionSurveyProps) {
  const [step, setStep] = useState<Step>('ask')
  const [otherText, setOtherText] = useState('')

  const submit = (answer: SurveyAnswer, text?: string) => {
    markAcquisitionSurveyAnswered()
    trackEvent('acquisition_survey_answered', buildSurveyAnswer(answer, text))
    setStep('done')
  }

  const handleChoose = (answer: SurveyAnswer) => {
    if (answer === 'other') {
      setStep(step === 'other' ? 'ask' : 'other')
      return
    }
    submit(answer)
  }

  const handleDismiss = () => {
    markAcquisitionSurveyDismissed()
    trackEvent('acquisition_survey_dismissed')
    onDismiss()
  }

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      transition={{ duration: 0.25 }}
      className="overflow-hidden"
    >
      <section
        aria-labelledby="acquisition-survey-heading"
        className="relative rounded-lg border border-gray-200 dark:border-white/8 bg-gray-50 dark:bg-white/5 p-4"
      >
        <AnimatePresence mode="wait" initial={false}>
          {step === 'done' ? (
            <motion.p
              key="done"
              {...stepTransition}
              role="status"
              className="text-sm text-gray-700 dark:text-zinc-300"
            >
              <span className="font-medium text-gray-900 dark:text-zinc-100">
                Thanks! 🙌
              </span>{' '}
              That really helps.
            </motion.p>
          ) : (
            <motion.div key="ask" {...stepTransition}>
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss question"
                className="absolute top-2.5 right-2.5 rounded-md p-1 text-gray-400 hover:text-gray-700 dark:text-zinc-500 dark:hover:text-zinc-300 cursor-pointer transition-colors"
              >
                <X className="size-4" />
              </button>
              <p
                id="acquisition-survey-heading"
                className="text-sm font-medium text-gray-900 dark:text-zinc-100 pr-6"
              >
                How did you hear about Yearly?
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-3">
                One tap — it helps us reach more travellers.
              </p>
              <div
                role="group"
                aria-labelledby="acquisition-survey-heading"
                className="flex flex-wrap gap-1.5"
              >
                {SURVEY_ANSWERS.map(({ value, label }) => {
                  const isOther = value === 'other'
                  const isActive = isOther && step === 'other'
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => handleChoose(value)}
                      aria-expanded={isOther ? isActive : undefined}
                      className={cn(
                        chipClassName,
                        isActive
                          ? 'border-gray-900 bg-gray-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-gray-900'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-white/8 dark:bg-[#141414] dark:text-zinc-300 dark:hover:bg-[#222222]'
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
              {step === 'other' && (
                <form
                  className="mt-3 flex gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    submit('other', otherText)
                  }}
                >
                  <Input
                    aria-label="Where did you hear about Yearly? (optional)"
                    value={otherText}
                    maxLength={SURVEY_OTHER_TEXT_MAX_LENGTH}
                    onChange={(event) => setOtherText(event.target.value)}
                    placeholder="Where? (optional)"
                    autoFocus
                    className="h-8 bg-white dark:bg-[#141414]"
                  />
                  <Button type="submit" size="sm">
                    Send
                  </Button>
                </form>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </motion.div>
  )
}
