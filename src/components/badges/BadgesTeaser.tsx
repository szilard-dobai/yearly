'use client'

import { Emoji } from '@/components/Emoji'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StandardCard } from '@/components/ui/card-variants'
import { trackEvent } from '@/lib/tracking'
import { Lock } from 'lucide-react'
import Link from 'next/link'

export default function BadgesTeaser({
  earned,
  total,
}: {
  earned: number
  total: number
}) {
  return (
    <StandardCard>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-zinc-100">
            <span className="text-2xl">
              <Emoji name="sportsMedal" />
            </span>
            Badges
          </CardTitle>
          <Lock className="size-4 text-gray-400 dark:text-zinc-500" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-700 dark:text-zinc-300">
          {earned > 0
            ? `Your trips already earn ${earned} of ${total} badges.`
            : 'Earn badges for new countries, new continents and long trips.'}
        </p>
        <Button asChild className="w-full">
          <Link
            href="/sign-in?next=/create"
            onClick={() => trackEvent('badges_teaser_click', { earned })}
          >
            {earned > 0 ? 'Sign in to see them' : 'Sign in to start collecting'}
          </Link>
        </Button>
      </CardContent>
    </StandardCard>
  )
}
