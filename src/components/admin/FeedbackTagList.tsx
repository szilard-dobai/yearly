import { FEEDBACK_TAG_LABELS, type FeedbackTag } from '@/lib/feedback/types'
import { cn } from '@/lib/utils'

export default function FeedbackTagList({
  tags,
  className,
}: {
  tags?: FeedbackTag[]
  className?: string
}) {
  if (!tags?.length) return null

  return (
    <ul
      aria-label="Quick replies"
      className={cn('flex flex-wrap gap-1.5', className)}
    >
      {tags.map((tag) => (
        <li
          key={tag}
          className="rounded-full border border-gray-200 dark:border-white/8 px-2 py-0.5 text-xs text-gray-700 dark:text-zinc-300"
        >
          {FEEDBACK_TAG_LABELS[tag] ?? tag}
        </li>
      ))}
    </ul>
  )
}
