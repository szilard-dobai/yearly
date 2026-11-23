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
import { cn } from '@/lib/utils'
import { useState } from 'react'
import { BadgeDetailsDialog, BadgeGrid, progressText } from './BadgeCollection'
import BadgeMedal from './BadgeMedal'

const RECENT_COUNT = 5
const MEDAL_BUTTON =
  'block cursor-pointer rounded-full transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:outline-none dark:focus-visible:ring-offset-[#141414]'

export default function BadgesCard({ badges }: { badges: Badge[] }) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Badge | null>(null)
  const earned = earnedBadges(badges)
  const next = earned.length > 0 ? nextBadge(badges) : null
  const nextProgress = next && progressText(next)

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
                  <button
                    type="button"
                    onClick={() => setSelected(badge)}
                    className={MEDAL_BUTTON}
                  >
                    <BadgeMedal badge={badge} size="sm" />
                    <span className="sr-only">{badge.name}</span>
                  </button>
                </li>
              ))}
              {earned.length > RECENT_COUNT && (
                <li>
                  <button
                    type="button"
                    onClick={openAll}
                    className={cn(
                      MEDAL_BUTTON,
                      'flex size-10 items-center justify-center bg-gray-100 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-white/8 dark:text-zinc-300 dark:hover:bg-white/12'
                    )}
                  >
                    +{earned.length - RECENT_COUNT}
                    <span className="sr-only"> more badges</span>
                  </button>
                </li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Add your first trip to earn your first badge.
            </p>
          )}
          {next && (
            <button
              type="button"
              onClick={() => setSelected(next)}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:outline-none dark:bg-white/4 dark:hover:bg-white/8"
            >
              <BadgeMedal badge={next} size="sm" />
              <span className="min-w-0 text-sm">
                <span className="block font-medium text-gray-900 dark:text-zinc-100">
                  Next: {next.name}
                </span>
                <span className="block text-xs text-gray-500 dark:text-zinc-400">
                  {nextProgress ?? next.description}
                </span>
              </span>
            </button>
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

      <BadgeDetailsDialog badge={selected} onClose={() => setSelected(null)} />
    </>
  )
}
