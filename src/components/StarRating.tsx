'use client'

import { FEEDBACK_RATINGS } from '@/lib/feedback/types'
import { cn } from '@/lib/utils'
import { Star } from 'lucide-react'
import { useState } from 'react'

export const RATING_LABELS: Record<number, string> = {
  1: 'Not great',
  2: 'Could be better',
  3: "It's okay",
  4: 'Pretty good',
  5: 'Love it!',
}

const SIZE_CLASSES = {
  sm: 'size-3.5',
  base: 'size-5',
  md: 'size-7',
  lg: 'size-9',
} as const

interface StarRatingProps {
  value: number | null
  onChange?: (value: number) => void
  size?: keyof typeof SIZE_CLASSES
  label?: string
  showHint?: boolean
  disabled?: boolean
  className?: string
}

function StarIcon({ filled, size }: { filled: boolean; size: string }) {
  return (
    <Star
      aria-hidden
      className={cn(
        size,
        'transition-colors',
        filled
          ? 'fill-amber-400 text-amber-400'
          : 'fill-transparent text-gray-300 dark:text-zinc-600'
      )}
    />
  )
}

export default function StarRating({
  value,
  onChange,
  size = 'md',
  label = 'Rating',
  showHint = false,
  disabled = false,
  className,
}: StarRatingProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const sizeClass = SIZE_CLASSES[size]

  if (!onChange) {
    return (
      <span
        role="img"
        aria-label={value ? `${value} out of 5 stars` : 'No rating'}
        className={cn('inline-flex items-center gap-0.5', className)}
      >
        {FEEDBACK_RATINGS.map((star) => (
          <StarIcon
            key={star}
            filled={value !== null && star <= value}
            size={sizeClass}
          />
        ))}
      </span>
    )
  }

  const displayValue = hovered ?? value
  const hint = displayValue ? RATING_LABELS[displayValue] : null

  return (
    <div className={cn('flex flex-col items-start gap-1.5', className)}>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex items-center gap-1"
        onMouseLeave={() => setHovered(null)}
      >
        {FEEDBACK_RATINGS.map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} ${star === 1 ? 'star' : 'stars'} – ${RATING_LABELS[star]}`}
            disabled={disabled}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            className="rounded-md p-0.5 cursor-pointer transition-transform hover:scale-110 active:scale-95 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            <StarIcon
              filled={displayValue !== null && star <= displayValue}
              size={sizeClass}
            />
          </button>
        ))}
      </div>
      {showHint && (
        <span
          aria-live="polite"
          className="h-4 text-xs font-medium text-gray-500 dark:text-zinc-400"
        >
          {hint}
        </span>
      )}
    </div>
  )
}
