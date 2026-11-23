'use client'

import { Emoji } from '@/components/Emoji'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StandardCard } from '@/components/ui/card-variants'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { earnedBadges, nextBadge, type Badge } from '@/lib/badges'
import { trackEvent } from '@/lib/tracking'
import { formatDay } from '@/lib/trips'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'
import { useState } from 'react'
import BadgeMedal from './BadgeMedal'

const RECENT_COUNT = 5

function formatEarnedOn(dayKey: string) {
  return dayjs(dayKey).format('D MMM YYYY')
}

function progressText(badge: Badge): string | null {
  if (badge.unlocksOn) {
    return `Your trip on ${formatDay(badge.unlocksOn)} unlocks it`
  }
  if (badge.target === 1) return null
  return `${badge.value} of ${badge.target} ${badge.unit}`
}

function statusText(badge: Badge): string | null {
  return badge.earnedOn
    ? `Earned on ${formatEarnedOn(badge.earnedOn)}`
    : progressText(badge)
}

function BadgeGrid({
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
                <span className="text-[10px] text-gray-500 dark:text-zinc-500">
                  {formatEarnedOn(badge.earnedOn)}
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

export default function BadgesCard({ badges }: { badges: Badge[] }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Badge | null>(null)
  const earned = earnedBadges(badges)
  const next = earned.length > 0 ? nextBadge(badges) : null
  const nextProgress = next && progressText(next)
  const selectedStatus = selected && statusText(selected)

  const openAll = () => {
    trackEvent('badges_open', { earned: earned.length })
    setOpen(true)
  }

  return (
    <>
      <StandardCard>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-zinc-100">
              <span className="text-2xl">
                <Emoji name="sportsMedal" />
              </span>
              Badges
            </CardTitle>
            <span className="text-sm text-gray-500 tabular-nums dark:text-zinc-400">
              {earned.length}/{badges.length}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className="h-1.5 rounded-full bg-gray-100 dark:bg-white/8"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={badges.length}
            aria-valuenow={earned.length}
            aria-label="Badges earned"
          >
            <div
              className="h-full rounded-full bg-linear-to-r from-amber-300 to-orange-400"
              style={{ width: `${(earned.length / badges.length) * 100}%` }}
            />
          </div>
          {earned.length > 0 ? (
            <ul className="flex gap-2" aria-label="Latest badges">
              {earned.slice(0, RECENT_COUNT).map((badge) => (
                <li key={badge.id}>
                  <BadgeMedal badge={badge} size="sm" />
                  <span className="sr-only">{badge.name}</span>
                </li>
              ))}
              {earned.length > RECENT_COUNT && (
                <li className="flex size-10 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 dark:bg-white/8 dark:text-zinc-300">
                  +{earned.length - RECENT_COUNT}
                </li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Add your first trip to earn your first badge.
            </p>
          )}
          {next && (
            <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-white/4">
              <BadgeMedal badge={next} size="sm" />
              <div className="min-w-0 text-sm">
                <p className="font-medium text-gray-900 dark:text-zinc-100">
                  Next: {next.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-zinc-400">
                  {nextProgress ?? next.description}
                </p>
              </div>
            </div>
          )}
          <Button variant="outline" className="w-full" onClick={openAll}>
            See all badges
          </Button>
        </CardContent>
      </StandardCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">
                <Emoji name="sportsMedal" />
              </span>
              Badges
            </DialogTitle>
            <DialogDescription>
              {earned.length} of {badges.length} earned. Badges come from the
              trips in your calendar. Planned trips count once their day comes.
            </DialogDescription>
          </DialogHeader>
          <BadgeGrid badges={badges} onSelect={setSelected} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={selected !== null}
        onOpenChange={(isOpen) => !isOpen && setSelected(null)}
      >
        <DialogContent className="text-center sm:max-w-sm">
          {selected && (
            <div className="flex flex-col items-center gap-3 pt-2">
              <BadgeMedal badge={selected} size="lg" />
              <DialogTitle className="font-serif text-2xl font-normal">
                {selected.name}
              </DialogTitle>
              <DialogDescription>{selected.description}</DialogDescription>
              {selectedStatus && (
                <p className="text-sm text-gray-500 dark:text-zinc-400">
                  {selectedStatus}
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
