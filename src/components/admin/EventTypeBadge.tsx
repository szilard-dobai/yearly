import { type EventTone, getEventLabel, getEventTone } from '@/lib/admin/format'
import { cn } from '@/lib/utils'

const TONE_BADGE_CLASSES: Record<EventTone, string> = {
  view: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  export:
    'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',
  feedback:
    'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  edit: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-white/8 dark:text-zinc-300',
}

const TONE_DOT_CLASSES: Record<EventTone, string> = {
  view: 'bg-sky-500',
  export: 'bg-violet-500',
  feedback: 'bg-amber-500',
  edit: 'bg-emerald-500',
  other: 'bg-gray-400 dark:bg-zinc-500',
}

export function EventToneDot({
  type,
  className,
}: {
  type: string
  className?: string
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block size-2 shrink-0 rounded-full',
        TONE_DOT_CLASSES[getEventTone(type)],
        className
      )}
    />
  )
}

export default function EventTypeBadge({
  type,
  count,
  className,
}: {
  type: string
  count?: number
  className?: string
}) {
  return (
    <span
      title={type}
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap',
        TONE_BADGE_CLASSES[getEventTone(type)],
        className
      )}
    >
      {getEventLabel(type)}
      {count !== undefined && ` × ${count.toLocaleString()}`}
    </span>
  )
}
