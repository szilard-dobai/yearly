'use client'

import { DayFlags } from '@/components/Emoji'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { earnedBadges, type Badge } from '@/lib/badges'
import { tripName } from '@/lib/trips'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'
import BadgeMedal from './BadgeMedal'

function formatDate(dayKey: string, withYear = true) {
  return dayjs(dayKey).format(withYear ? 'D MMM YYYY' : 'D MMM')
}

function yourTrip(badge: Badge) {
  return badge.trip ? `Your trip to ${tripName(badge.trip)}` : 'Your trip'
}

export function progressText(badge: Badge): string | null {
  if (badge.unlocksOn) {
    const thisYear = dayjs(badge.unlocksOn).year() === dayjs().year()
    return `${yourTrip(badge)} on ${formatDate(badge.unlocksOn, !thisYear)} unlocks it`
  }
  if (badge.target === 1) return null
  return `${badge.value} of ${badge.target} ${badge.unit}`
}

function statusText(badge: Badge): string | null {
  return badge.earnedOn
    ? `${yourTrip(badge)} on ${formatDate(badge.earnedOn)} earned it`
    : progressText(badge)
}

export function BadgeGrid({
  badges,
  onSelect,
}: {
  badges: Badge[]
  onSelect: (badge: Badge) => void
}) {
  const sorted = [
    ...earnedBadges(badges),
    ...badges.filter((badge) => !badge.earnedOn),
  ]
  return (
    <ul className="grid grid-cols-3 gap-x-2 gap-y-6 sm:grid-cols-4">
      {sorted.map((badge) => {
        const status = statusText(badge)
        return (
          <li key={badge.id}>
            <button
              type="button"
              onClick={() => onSelect(badge)}
              className="group flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg p-1 text-center"
            >
              <span className="transition-transform group-hover:scale-105">
                <BadgeMedal badge={badge} />
              </span>
              <span
                className={cn(
                  'text-xs leading-tight font-medium',
                  badge.earnedOn
                    ? 'text-gray-900 dark:text-zinc-100'
                    : 'text-gray-500 dark:text-zinc-500'
                )}
              >
                {badge.name}
              </span>
              {badge.earnedOn ? (
                <span className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-zinc-500">
                  {badge.dayCountries.length > 0 && (
                    <DayFlags codes={badge.dayCountries} className="text-sm" />
                  )}
                  {formatDate(badge.earnedOn)}
                </span>
              ) : (
                <>
                  <span
                    aria-hidden="true"
                    className="h-1 w-12 rounded-full bg-gray-100 dark:bg-white/8"
                  >
                    <span
                      className="block h-full rounded-full bg-gray-400 dark:bg-zinc-500"
                      style={{
                        width: `${(badge.value / badge.target) * 100}%`,
                      }}
                    />
                  </span>
                  {status && <span className="sr-only">{status}</span>}
                </>
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}

export function BadgeDetailsDialog({
  badge,
  onClose,
}: {
  badge: Badge | null
  onClose: () => void
}) {
  const status = badge && statusText(badge)
  return (
    <Dialog
      open={badge !== null}
      onOpenChange={(isOpen) => !isOpen && onClose()}
    >
      <DialogContent className="text-center sm:max-w-sm">
        {badge && (
          <div className="flex flex-col items-center gap-3 pt-2">
            <BadgeMedal badge={badge} size="lg" />
            <DialogTitle className="font-serif text-2xl font-normal">
              {badge.name}
            </DialogTitle>
            <DialogDescription className="text-balance">
              {badge.description}
            </DialogDescription>
            {status && (
              <p className="text-sm text-balance text-gray-500 dark:text-zinc-400">
                {status}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
