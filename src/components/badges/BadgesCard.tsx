'use client'

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
import { nextBadge, type Badge } from '@/lib/badges'
import { trackEvent } from '@/lib/tracking'
import dayjs from 'dayjs'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import BadgeMedal from './BadgeMedal'

function formatDate(dayKey: string, withYear = false) {
  return dayjs(dayKey).format(withYear ? 'D MMM YYYY' : 'D MMM')
}

function progressText(badge: Badge) {
  return badge.unlocksOn
    ? `Your trip on ${formatDate(badge.unlocksOn)} unlocks it`
    : `${badge.value} of ${badge.target} ${badge.unit}`
}

function BadgeGrid({
  badges,
  onSelect,
}: {
  badges: Badge[]
  onSelect: (badge: Badge) => void
}) {
  const sorted = [
    ...badges.filter((b) => b.earnedOn),
    ...badges.filter((b) => !b.earnedOn),
  ]
  return (
    <ul className="grid grid-cols-3 gap-x-2 gap-y-6 sm:grid-cols-4 md:grid-cols-5">
      {sorted.map((badge) => (
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
                'text-xs font-medium leading-tight',
                badge.earnedOn
                  ? 'text-gray-900 dark:text-zinc-100'
                  : 'text-gray-500 dark:text-zinc-500'
              )}
            >
              {badge.name}
            </span>
            {badge.earnedOn ? (
              <span className="text-[10px] text-gray-500 dark:text-zinc-500">
                {formatDate(badge.earnedOn, true)}
              </span>
            ) : (
              <span
                className="h-1 w-12 rounded-full bg-gray-100 dark:bg-white/8"
                aria-label={progressText(badge)}
              >
                <span
                  className="block h-full rounded-full bg-gray-400 dark:bg-zinc-500"
                  style={{ width: `${(badge.value / badge.target) * 100}%` }}
                />
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}

export default function BadgesCard({ badges }: { badges: Badge[] }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Badge | null>(null)
  const earned = badges
    .filter((b) => b.earnedOn)
    .sort((a, b) => (a.earnedOn! < b.earnedOn! ? 1 : -1))
  const next = nextBadge(badges)

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
              <span className="text-2xl">🏅</span>
              Badges
            </CardTitle>
            <span className="text-sm tabular-nums text-gray-500 dark:text-zinc-400">
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
            <div className="flex gap-2">
              {earned.slice(0, 5).map((badge) => (
                <span key={badge.id} title={badge.name}>
                  <BadgeMedal badge={badge} size="sm" />
                </span>
              ))}
              {earned.length > 5 && (
                <span className="flex size-10 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600 dark:bg-white/8 dark:text-zinc-300">
                  +{earned.length - 5}
                </span>
              )}
            </div>
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
                  {progressText(next)}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">🏅</span>
              Badges
            </DialogTitle>
            <DialogDescription>
              {earned.length} of {badges.length} earned. Badges come from the
              trips in your calendar; planned trips count once they happen.
            </DialogDescription>
          </DialogHeader>
          <BadgeGrid badges={badges} onSelect={setSelected} />
        </DialogContent>
      </Dialog>

      <Dialog
        open={selected !== null}
        onOpenChange={(isOpen) => !isOpen && setSelected(null)}
      >
        <DialogContent className="max-w-sm text-center">
          {selected && (
            <div className="flex flex-col items-center gap-3 pt-2">
              <BadgeMedal badge={selected} size="lg" />
              <DialogTitle className="font-serif text-2xl font-normal">
                {selected.name}
              </DialogTitle>
              <DialogDescription>{selected.description}</DialogDescription>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                {selected.earnedOn
                  ? `Earned on ${formatDate(selected.earnedOn, true)}`
                  : progressText(selected)}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
