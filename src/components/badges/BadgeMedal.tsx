import type { Badge } from '@/lib/badges'
import { cn } from '@/lib/utils'
import { Lock } from 'lucide-react'

const SIZES = {
  sm: { box: 'size-10 text-xl', ring: 'inset-0.5' },
  md: { box: 'size-16 text-3xl', ring: 'inset-1' },
  lg: { box: 'size-28 text-5xl', ring: 'inset-2' },
}

export default function BadgeMedal({
  badge,
  size = 'md',
}: {
  badge: Pick<Badge, 'emoji' | 'earnedOn'>
  size?: keyof typeof SIZES
}) {
  const earned = badge.earnedOn !== null
  return (
    <span
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full',
        SIZES[size].box,
        earned
          ? 'bg-linear-to-br from-amber-200 via-amber-300 to-orange-400 shadow-[inset_0_-3px_0_rgb(0_0_0/0.12)] dark:from-amber-300 dark:via-amber-400 dark:to-orange-500'
          : 'bg-gray-100 dark:bg-white/6'
      )}
    >
      <span
        className={cn(
          'absolute rounded-full border-2',
          SIZES[size].ring,
          earned
            ? 'border-white/60'
            : 'border-dashed border-gray-300 dark:border-white/12'
        )}
      />
      <span
        aria-hidden="true"
        className={cn(!earned && 'opacity-35 grayscale')}
      >
        {badge.emoji}
      </span>
      {!earned && size !== 'sm' && (
        <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-white shadow-sm dark:bg-[#222222]">
          <Lock className="size-3 text-gray-500 dark:text-zinc-400" />
        </span>
      )}
    </span>
  )
}
