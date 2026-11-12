'use client'

import { Button } from '@/components/ui/button'
import type { Badge } from '@/lib/badges'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
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

export default function BadgeUnlockedDialog({
  badges,
  onClose,
}: {
  badges: Badge[]
  onClose: () => void
}) {
  const reduceMotion = useReducedMotion()
  const badge = badges.at(-1)
  return (
    <AnimatePresence>
      {badge && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="badge-unlocked-title"
            className="relative w-full max-w-xs rounded-2xl bg-white p-8 text-center shadow-2xl dark:bg-[#1a1a1a]"
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.4, duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative mx-auto flex size-28 items-center justify-center">
              {!reduceMotion && (
                <motion.span
                  className="absolute inset-[-14px] rounded-full bg-[conic-gradient(from_0deg,transparent,rgb(251_191_36/0.35),transparent_30%,rgb(251_191_36/0.35),transparent_60%,rgb(251_191_36/0.35),transparent_90%)]"
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
            <p className="mt-8 text-xs font-medium uppercase tracking-widest text-amber-600 dark:text-amber-400">
              Badge unlocked
            </p>
            <p
              id="badge-unlocked-title"
              className="mt-1 font-serif text-3xl text-gray-900 dark:text-white"
            >
              {badge.name}
            </p>
            <p className="mt-2 text-sm text-gray-500 dark:text-zinc-400">
              {badge.description}
            </p>
            {badges.length > 1 && (
              <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
                and {badges.length - 1} more{' '}
                {badges.length === 2 ? 'badge' : 'badges'}
              </p>
            )}
            <Button
              autoFocus
              className="mt-6 w-full bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
              onClick={onClose}
            >
              Nice
            </Button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
