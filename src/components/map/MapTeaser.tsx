'use client'

import { Emoji } from '@/components/Emoji'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StandardCard } from '@/components/ui/card-variants'
import { trackEvent } from '@/lib/tracking'
import { Lock } from 'lucide-react'
import Link from 'next/link'

export default function MapTeaser({ countryCount }: { countryCount: number }) {
  return (
    <StandardCard>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-zinc-100">
            <span className="text-2xl">
              <Emoji name="worldMap" />
            </span>
            World map
          </CardTitle>
          <Lock className="size-4 text-gray-400 dark:text-zinc-500" />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-700 dark:text-zinc-300">
          See your {countryCount} {countryCount === 1 ? 'country' : 'countries'}{' '}
          on a world map, each one filled with its flag.
        </p>
        <Button asChild className="shrink-0">
          <Link
            href="/sign-in?next=/create"
            onClick={() => trackEvent('map_teaser_click', { countryCount })}
          >
            Sign in to see your map
          </Link>
        </Button>
      </CardContent>
    </StandardCard>
  )
}
