'use client'

import FeedbackPrompt from '@/components/FeedbackPrompt'
import { StandardCard } from '@/components/ui/card-variants'
import { useCanAskForFeedback } from '@/lib/hooks/useCanAskForFeedback'
import { trackEvent } from '@/lib/tracking'
import { useEffect, useRef, useState } from 'react'

export default function FeedbackCard({ year }: { year: number }) {
  const canAsk = useCanAskForFeedback()
  const [engaged, setEngaged] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const seenRef = useRef(false)

  const visible = !dismissed && (canAsk || engaged)

  useEffect(() => {
    const card = cardRef.current
    if (!visible || !card || seenRef.current) return

    const markSeen = () => {
      seenRef.current = true
      trackEvent('feedback_prompt_shown', { source: 'create_card', year })
    }

    if (typeof IntersectionObserver === 'undefined') {
      markSeen()
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return
        observer.disconnect()
        markSeen()
      },
      { threshold: 0.5 }
    )
    observer.observe(card)
    return () => observer.disconnect()
  }, [visible, year])

  if (!visible) return null

  return (
    <StandardCard ref={cardRef} className="gap-0 py-0">
      <FeedbackPrompt
        source="create_card"
        context={{ year }}
        title="How's Yearly so far?"
        description="Rate it in one tap. We read every reply."
        expandIn={false}
        onRate={() => setEngaged(true)}
        onDismiss={() => setDismissed(true)}
        className="border-0 bg-transparent px-6 py-5 dark:bg-transparent"
      />
    </StandardCard>
  )
}
