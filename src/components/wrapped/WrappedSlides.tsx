'use client'

import BadgeMedal from '@/components/badges/BadgeMedal'
import Flag from '@/components/Flag'
import WorldMap from '@/components/map/WorldMap'
import type { Badge } from '@/lib/badges'
import { MONTH_NAMES, MONTH_NAMES_SHORT } from '@/lib/constants'
import type { FlagDisplayMode } from '@/lib/contexts/SettingsContext'
import {
  countryName,
  formatDayRange,
  pluralDays,
  tripName,
  type DayMap,
} from '@/lib/trips'
import { cn } from '@/lib/utils'
import type { YearSummary } from '@/lib/year-summary'
import dayjs from 'dayjs'
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

export type SlideTheme = 'dark' | 'light'

export interface Slide {
  id: string
  theme: SlideTheme
  content: ReactNode
}

function Rise({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode
  delay?: number
  className?: string
}) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduceMotion ? false : { y: 24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-medium uppercase tracking-[0.25em] opacity-60">
      {children}
    </p>
  )
}

function Big({ children }: { children: ReactNode }) {
  return (
    <p className="font-serif text-6xl leading-[0.95] tracking-tight sm:text-7xl">
      {children}
    </p>
  )
}

function countriesLabel(count: number) {
  return `${count} ${count === 1 ? 'country' : 'countries'}`
}

function YearDots({ dayMap, year }: { dayMap: DayMap; year: number }) {
  const reduceMotion = useReducedMotion()
  const start = dayjs(`${year}-01-01`)
  const total = start.add(1, 'year').diff(start, 'day')
  return (
    <div
      className="grid gap-[3px]"
      style={{ gridTemplateColumns: 'repeat(21, minmax(0, 1fr))' }}
      aria-hidden="true"
    >
      {Array.from({ length: total }, (_, i) => {
        const key = start.add(i, 'day').format('YYYY-MM-DD')
        const away = dayMap.has(key)
        return (
          <motion.span
            key={key}
            className={cn(
              'aspect-square rounded-full bg-current',
              !away && 'opacity-15'
            )}
            initial={away && !reduceMotion ? { scale: 0 } : false}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 + (i / total) * 1.2, duration: 0.2 }}
          />
        )
      })}
    </div>
  )
}

interface BuildSlidesOptions {
  summary: YearSummary
  dayMap: DayMap
  badges: Badge[]
  flagMode: FlagDisplayMode
  outro: ReactNode
}

export function buildSlides({
  summary,
  dayMap,
  badges,
  flagMode,
  outro,
}: BuildSlidesOptions): Slide[] {
  const flag = (code: string, className: string) => (
    <Flag countryCode={code} displayMode={flagMode} className={className} />
  )
  const start = dayjs(`${summary.year}-01-01`)
  const yearLength = start.add(1, 'year').diff(start, 'day')
  const percent = Math.round((summary.days / yearLength) * 100)
  const top = summary.countries[0]
  const best = summary.busiestMonth
  const maxMonth = Math.max(1, ...summary.months)
  const longest = summary.longestTrip
  const yearBadges = badges.filter((b) =>
    b.earnedOn?.startsWith(`${summary.year}-`)
  )

  const slides: Slide[] = [
    {
      id: 'intro',
      theme: 'dark',
      content: (
        <div className="flex h-full flex-col justify-between">
          <Rise>
            <Kicker>Yearly</Kicker>
          </Rise>
          <div>
            <Rise delay={0.1}>
              <p className="font-serif text-[7.5rem] leading-none tracking-tighter">
                {summary.year}
              </p>
            </Rise>
            <Rise delay={0.3}>
              <p className="mt-3 text-xl opacity-80">Your year in travel</p>
            </Rise>
          </div>
          <Rise delay={0.5} className="flex flex-wrap gap-2">
            {summary.countries.map((c) => (
              <span key={c.code}>
                {flag(c.code, 'text-3xl sm:text-3xl w-9 h-6 sm:w-9 sm:h-6')}
              </span>
            ))}
          </Rise>
        </div>
      ),
    },
    {
      id: 'countries',
      theme: 'light',
      content: (
        <div className="flex h-full flex-col justify-center gap-8">
          <div>
            <Rise>
              <Kicker>You visited</Kicker>
            </Rise>
            <Rise delay={0.15}>
              <Big>{countriesLabel(summary.countries.length)}</Big>
            </Rise>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {summary.countries.slice(0, 16).map((c, i) => (
              <Rise
                key={c.code}
                delay={0.35 + i * 0.06}
                className="flex flex-col items-center gap-1"
              >
                {flag(c.code, 'text-5xl sm:text-5xl w-14 h-10 sm:w-14 sm:h-10')}
                <span className="w-full truncate text-center text-[10px] opacity-60">
                  {countryName(c.code)}
                </span>
              </Rise>
            ))}
          </div>
        </div>
      ),
    },
    {
      id: 'days',
      theme: 'dark',
      content: (
        <div className="flex h-full flex-col justify-center gap-8">
          <div>
            <Rise>
              <Kicker>Days abroad</Kicker>
            </Rise>
            <Rise delay={0.15}>
              <Big>{summary.days}</Big>
            </Rise>
            <Rise delay={0.3}>
              <p className="mt-3 text-lg opacity-80">
                {percent}% of your year
                {percent >= 20
                  ? `, about one day in ${Math.round(100 / percent)}`
                  : ''}
              </p>
            </Rise>
          </div>
          <YearDots dayMap={dayMap} year={summary.year} />
        </div>
      ),
    },
  ]

  if (top) {
    const tripsToTop = summary.trips.filter((t) =>
      t.countries.includes(top.code)
    ).length
    slides.push({
      id: 'favourite',
      theme: 'light',
      content: (
        <div className="flex h-full flex-col justify-center gap-6">
          <Rise>
            <Kicker>Your favourite</Kicker>
          </Rise>
          <Rise delay={0.15}>
            {flag(
              top.code,
              'text-[8rem] sm:text-[8rem] w-40 h-28 sm:w-40 sm:h-28'
            )}
          </Rise>
          <Rise delay={0.3}>
            <Big>{countryName(top.code)}</Big>
          </Rise>
          <Rise delay={0.45}>
            <p className="text-lg opacity-70">
              {pluralDays(top.days)} over {tripsToTop}{' '}
              {tripsToTop === 1 ? 'trip' : 'trips'}
            </p>
          </Rise>
        </div>
      ),
    })
  }

  if (best !== null) {
    slides.push({
      id: 'month',
      theme: 'dark',
      content: (
        <div className="flex h-full flex-col justify-center gap-10">
          <div>
            <Rise>
              <Kicker>Busiest month</Kicker>
            </Rise>
            <Rise delay={0.15}>
              <Big>{MONTH_NAMES[best]}</Big>
            </Rise>
            <Rise delay={0.3}>
              <p className="mt-3 text-lg opacity-70">
                {pluralDays(summary.months[best])} away
              </p>
            </Rise>
          </div>
          <div className="flex h-36 items-end gap-1.5" aria-hidden="true">
            {summary.months.map((days, i) => (
              <div
                key={i}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1.5"
              >
                <motion.div
                  className={cn(
                    'w-full rounded-t-[4px] bg-current',
                    i !== best && 'opacity-30'
                  )}
                  initial={{ height: 0 }}
                  animate={{ height: `${(days / maxMonth) * 100}%` }}
                  transition={{
                    delay: 0.4 + i * 0.05,
                    duration: 0.5,
                    ease: 'easeOut',
                  }}
                />
                <span className={cn('text-[9px]', i !== best && 'opacity-50')}>
                  {MONTH_NAMES_SHORT[i][0]}
                </span>
              </div>
            ))}
          </div>
        </div>
      ),
    })
  }

  if (longest) {
    slides.push({
      id: 'longest',
      theme: 'light',
      content: (
        <div className="flex h-full flex-col justify-center gap-6">
          <Rise>
            <Kicker>Longest trip</Kicker>
          </Rise>
          <Rise delay={0.15}>
            <Big>{pluralDays(longest.days.length)}</Big>
          </Rise>
          <Rise delay={0.3}>
            <p className="text-2xl">{tripName(longest)}</p>
            <p className="mt-1 text-lg opacity-60">
              {formatDayRange(longest.start, longest.end)}
            </p>
          </Rise>
          <Rise delay={0.45} className="flex gap-2">
            {longest.countries.map((c) => (
              <span key={c}>
                {flag(c, 'text-5xl sm:text-5xl w-14 h-10 sm:w-14 sm:h-10')}
              </span>
            ))}
          </Rise>
        </div>
      ),
    })
  }

  if (summary.newCountries.length > 0) {
    slides.push({
      id: 'new',
      theme: 'dark',
      content: (
        <div className="flex h-full flex-col justify-center gap-8">
          <div>
            <Rise>
              <Kicker>First time in</Kicker>
            </Rise>
            <Rise delay={0.15}>
              <Big>
                {summary.newCountries.length} new{' '}
                {summary.newCountries.length === 1 ? 'country' : 'countries'}
              </Big>
            </Rise>
          </div>
          <div className="space-y-2.5">
            {summary.newCountries.slice(0, 8).map((code, i) => (
              <Rise
                key={code}
                delay={0.3 + i * 0.07}
                className="flex items-center gap-3"
              >
                {flag(code, 'text-3xl sm:text-3xl w-9 h-6 sm:w-9 sm:h-6')}
                <span className="text-lg">{countryName(code)}</span>
              </Rise>
            ))}
          </div>
        </div>
      ),
    })
  }

  slides.push({
    id: 'map',
    theme: 'light',
    content: (
      <div className="flex h-full flex-col justify-center gap-6">
        <Rise>
          <Kicker>Your {summary.year} map</Kicker>
        </Rise>
        <Rise delay={0.15}>
          <Big>
            {summary.continents.length}{' '}
            {summary.continents.length === 1 ? 'continent' : 'continents'}
          </Big>
        </Rise>
        <Rise delay={0.3}>
          <WorldMap
            countries={summary.countries}
            interactive={false}
            emptyClassName="fill-zinc-200"
            strokeClassName="stroke-white"
          />
        </Rise>
      </div>
    ),
  })

  if (yearBadges.length > 0) {
    slides.push({
      id: 'badges',
      theme: 'dark',
      content: (
        <div className="flex h-full flex-col justify-center gap-8">
          <div>
            <Rise>
              <Kicker>Badges earned</Kicker>
            </Rise>
            <Rise delay={0.15}>
              <Big>{yearBadges.length} new</Big>
            </Rise>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {yearBadges.slice(0, 9).map((badge, i) => (
              <Rise
                key={badge.id}
                delay={0.3 + i * 0.08}
                className="flex flex-col items-center gap-2 text-center"
              >
                <BadgeMedal badge={badge} />
                <span className="text-xs">{badge.name}</span>
              </Rise>
            ))}
          </div>
        </div>
      ),
    })
  }

  slides.push({ id: 'outro', theme: 'dark', content: outro })
  return slides
}
