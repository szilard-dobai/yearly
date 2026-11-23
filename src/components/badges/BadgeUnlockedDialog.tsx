'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Badge } from '@/lib/badges'
import { motion, useReducedMotion } from 'motion/react'
import BadgeMedal from './BadgeMedal'

function Burst() {
  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2
        return (
          <motion.span
            key={i}
            className="absolute top-1/2 left-1/2 size-2 rounded-full bg-amber-400"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(angle) * 90,
              y: Math.sin(angle) * 90,
              opacity: 0,
              scale: 0.4,
            }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
          />
        )
      })}
    </span>
  )
}

function newest(badges: Badge[]): Badge | null {
  return badges.reduce<Badge | null>(
    (latest, badge) =>
      !latest || badge.earnedOn! >= latest.earnedOn! ? badge : latest,
    null
  )
}

export default function BadgeUnlockedDialog({
  badges,
  open,
  onOpenChange,
}: {
  badges: Badge[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const reduceMotion = useReducedMotion()
  const badge = newest(badges)
  return (
    <Dialog open={open && badge !== null} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="gap-0 rounded-2xl p-8 text-center sm:max-w-xs dark:bg-[#1a1a1a]"
      >
        {badge && (
          <>
            <div className="relative mx-auto flex size-28 items-center justify-center">
              {!reduceMotion && (
                <motion.span
                  aria-hidden="true"
                  className="absolute -inset-3.5 rounded-full bg-[conic-gradient(from_0deg,transparent,rgb(251_191_36/0.35),transparent_30%,rgb(251_191_36/0.35),transparent_60%,rgb(251_191_36/0.35),transparent_90%)]"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
                />
              )}
              <motion.span
                initial={reduceMotion ? false : { scale: 0, rotate: -30 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', bounce: 0.55, duration: 0.7 }}
              >
                <BadgeMedal badge={badge} size="lg" />
              </motion.span>
              {!reduceMotion && <Burst />}
            </div>
            <p className="mt-8 text-xs font-medium tracking-widest text-amber-600 uppercase dark:text-amber-400">
              Badge unlocked
            </p>
            <DialogTitle className="mt-1 font-serif text-3xl leading-tight font-normal text-gray-900 dark:text-white">
              {badge.name}
            </DialogTitle>
            <DialogDescription className="mt-2 text-gray-500 dark:text-zinc-400">
              {badge.description}
            </DialogDescription>
            {badges.length > 1 && (
              <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                and {badges.length - 1} more{' '}
                {badges.length === 2 ? 'badge' : 'badges'}
              </p>
            )}
            <Button
              autoFocus
              className="mt-6 w-full bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              onClick={() => onOpenChange(false)}
            >
              Nice
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
