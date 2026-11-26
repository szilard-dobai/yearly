import {
  type EventGroup,
  getEventGroup,
  getEventLabel,
} from '@/lib/admin/format'
import { cn } from '@/lib/utils'

const GROUP_BADGE_CLASSES: Record<EventGroup, string> = {
  pages: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  calendar:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  exports:
    'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300',
  videos:
    'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-300',
  feedback:
    'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  reminder: 'bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300',
  accounts:
    'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300',
  trips: 'bg-lime-100 text-lime-800 dark:bg-lime-500/15 dark:text-lime-300',
  badges:
    'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
  other: 'bg-gray-100 text-gray-700 dark:bg-white/8 dark:text-zinc-300',
}

const GROUP_DOT_CLASSES: Record<EventGroup, string> = {
  pages: 'bg-sky-500',
  calendar: 'bg-emerald-500',
  exports: 'bg-violet-500',
  videos: 'bg-fuchsia-500',
  feedback: 'bg-amber-500',
  reminder: 'bg-rose-500',
  accounts: 'bg-indigo-500',
  trips: 'bg-lime-500',
  badges: 'bg-orange-500',
  other: 'bg-gray-400 dark:bg-zinc-500',
}

export function EventGroupDot({
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
        GROUP_DOT_CLASSES[getEventGroup(type)],
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
        GROUP_BADGE_CLASSES[getEventGroup(type)],
        className
      )}
    >
      {getEventLabel(type)}
      {count !== undefined && ` × ${count.toLocaleString()}`}
    </span>
  )
}
