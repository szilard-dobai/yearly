# Monthly Export Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a monthly export feature that generates a single vertical image combining a one-month calendar grid with month-scoped statistics.

**Architecture:** New `MonthlyExportLayout` component renders the export image (calendar + stats for one month). New `useMonthlyExport` hook handles the clone-style-export pipeline. A new `calculatePercentageOfMonthTraveled` function is added to statistics. The sidebar export card, `MobileFab`, `MonthGrid`, and `create/page.tsx` are extended to wire the feature in.

**Tech Stack:** React 19, Next.js 16, TypeScript, Tailwind CSS v4, html-to-image, Vitest

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/lib/statistics.ts` | Modify | Add `calculatePercentageOfMonthTraveled` |
| `src/lib/statistics.test.ts` | Create | Tests for new monthly stat function |
| `src/lib/tracking/types.ts` | Modify | Add `monthly_export_click` event type |
| `src/components/MonthlyExportLayout.tsx` | Create | Export-only layout: month header + calendar grid + stats + countries + watermark |
| `src/components/MonthGrid.tsx` | Modify | Add hover download icon on month header |
| `src/components/CalendarGrid.tsx` | Modify | Pass `onMonthExport` through to `MonthGrid` |
| `src/lib/hooks/useMonthlyExport.ts` | Create | Clone, style, and export `MonthlyExportLayout` as JPEG |
| `src/components/MobileFab.tsx` | Modify | Add monthly export FAB button |
| `src/app/create/page.tsx` | Modify | Wire everything: state, refs, sidebar UI, dialogs, modals |

---

## Chunk 1: Statistics + Tracking Foundation

### Task 1: Add `calculatePercentageOfMonthTraveled` to statistics

**Files:**
- Modify: `src/lib/statistics.ts:306-324`
- Create: `src/lib/statistics.test.ts`

- [ ] **Step 1: Create test file with failing tests**

Create `src/lib/statistics.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { calculatePercentageOfMonthTraveled } from './statistics'
import type { CountryVisit } from './types'

function makeVisit(countryCode: string, dateStr: string): CountryVisit {
  return { id: `${countryCode}-${dateStr}`, countryCode, date: new Date(dateStr) }
}

describe('calculatePercentageOfMonthTraveled', () => {
  it('returns 0 for empty visits', () => {
    expect(calculatePercentageOfMonthTraveled([], 2026, 2)).toBe(0)
  })

  it('calculates percentage for a month with visits', () => {
    const visits = [
      makeVisit('FR', '2026-03-03'),
      makeVisit('FR', '2026-03-04'),
      makeVisit('FR', '2026-03-05'),
    ]
    // 3 days out of 31 in March = ~9.68%
    const result = calculatePercentageOfMonthTraveled(visits, 2026, 2) // month 2 = March
    expect(result).toBeCloseTo(9.68, 1)
  })

  it('counts unique days only (multiple countries on same day = 1 day)', () => {
    const visits = [
      makeVisit('FR', '2026-03-03'),
      makeVisit('IT', '2026-03-03'),
      makeVisit('FR', '2026-03-04'),
    ]
    // 2 unique days out of 31 = ~6.45%
    const result = calculatePercentageOfMonthTraveled(visits, 2026, 2)
    expect(result).toBeCloseTo(6.45, 1)
  })

  it('ignores visits from other months', () => {
    const visits = [
      makeVisit('FR', '2026-03-03'),
      makeVisit('IT', '2026-04-03'),
    ]
    // 1 day out of 31 in March = ~3.23%
    const result = calculatePercentageOfMonthTraveled(visits, 2026, 2)
    expect(result).toBeCloseTo(3.23, 1)
  })

  it('handles February in leap year', () => {
    const visits = [makeVisit('FR', '2024-02-15')]
    // 1 day out of 29 in Feb 2024 = ~3.45%
    const result = calculatePercentageOfMonthTraveled(visits, 2024, 1)
    expect(result).toBeCloseTo(3.45, 1)
  })

  it('handles February in non-leap year', () => {
    const visits = [makeVisit('FR', '2026-02-15')]
    // 1 day out of 28 in Feb 2026 = ~3.57%
    const result = calculatePercentageOfMonthTraveled(visits, 2026, 1)
    expect(result).toBeCloseTo(3.57, 1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/statistics.test.ts`
Expected: FAIL — `calculatePercentageOfMonthTraveled` is not exported

- [ ] **Step 3: Implement `calculatePercentageOfMonthTraveled`**

Add to the end of `src/lib/statistics.ts`:

```typescript
/**
 * Calculates percentage of a specific month spent traveling
 * Days with multiple country visits count as 1 day
 * @param visits - Array of visits (pre-filtered to relevant year or not)
 * @param year - The year
 * @param month - The month (0-11, where 0 = January)
 */
export function calculatePercentageOfMonthTraveled(
  visits: CountryVisit[],
  year: number,
  month: number
): number {
  const monthVisits = visits.filter(
    (v) => v.date.getFullYear() === year && v.date.getMonth() === month
  )

  const uniqueDays = new Set(
    monthVisits.map((v) => v.date.toISOString().split('T')[0])
  )
  const totalDays = uniqueDays.size

  const daysInMonth = new Date(year, month + 1, 0).getDate()

  return (totalDays / daysInMonth) * 100
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/statistics.test.ts`
Expected: All 6 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/statistics.ts src/lib/statistics.test.ts
git commit -m "feat: add calculatePercentageOfMonthTraveled statistic"
```

### Task 2: Add `monthly_export_click` tracking event type

**Files:**
- Modify: `src/lib/tracking/types.ts:5-26`

- [ ] **Step 1: Add the event type**

Add `'monthly_export_click'` to the `TrackingEventType` union in `src/lib/tracking/types.ts`, after `'statistics_export_click'` (line 22):

```typescript
  | 'monthly_export_click'
```

And add the metadata interface at the end of the file:

```typescript
export interface MonthlyExportClickMetadata {
  year: number
  month: number
  source: 'sidebar' | 'header' | 'mobile_fab'
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/tracking/types.ts
git commit -m "feat: add monthly_export_click tracking event type"
```

---

## Chunk 2: MonthlyExportLayout Component

### Task 3: Create `MonthlyExportLayout` component

**Files:**
- Create: `src/components/MonthlyExportLayout.tsx`

This component is rendered hidden in the DOM and used as the source for `html-to-image` export. It is a self-contained render (no `MonthGrid`/`DateCell` reuse) to avoid interactive elements.

- [ ] **Step 1: Create the component**

Create `src/components/MonthlyExportLayout.tsx`:

```tsx
'use client'

import { forwardRef, useMemo } from 'react'
import type { CalendarData } from '@/lib/types'
import { getCountryByCode } from '@/lib/countries'
import { getMonthData, getVisitsForDate } from '@/lib/calendar'
import { useSettings } from '@/lib/contexts/SettingsContext'
import { MONTH_NAMES } from '@/lib/constants'
import Flag from './Flag'
import {
  calculateTotalCountriesVisited,
  calculateTotalDaysTraveled,
  calculateCountriesByDays,
  calculateAverageTripLength,
  calculatePercentageOfMonthTraveled,
} from '@/lib/statistics'

interface MonthlyExportLayoutProps {
  calendarData: CalendarData
  year: number
  month: number
}

const MonthlyExportLayout = forwardRef<HTMLDivElement, MonthlyExportLayoutProps>(
  ({ calendarData, year, month }, ref) => {
    const { settings } = useSettings()

    const monthVisits = useMemo(
      () =>
        calendarData.visits.filter(
          (visit) =>
            visit.date.getFullYear() === year &&
            visit.date.getMonth() === month
        ),
      [calendarData.visits, year, month]
    )

    const weeks = useMemo(
      () => getMonthData(year, month, settings.weekStartsOn),
      [year, month, settings.weekStartsOn]
    )

    const stats = useMemo(() => {
      const totalCountries = calculateTotalCountriesVisited(monthVisits)
      const totalDays = calculateTotalDaysTraveled(monthVisits)
      const averageTripLength = calculateAverageTripLength(monthVisits)
      const countriesByDays = calculateCountriesByDays(monthVisits, 5)
      const percentTraveled = calculatePercentageOfMonthTraveled(
        monthVisits,
        year,
        month
      )

      return {
        totalCountries,
        totalDays,
        averageTripLength,
        countriesByDays,
        percentTraveled,
      }
    }, [monthVisits, year, month])

    const dayLabels = useMemo(() => {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
      const reordered = []
      for (let i = 0; i < 7; i++) {
        reordered.push(days[(settings.weekStartsOn + i) % 7])
      }
      return reordered
    }, [settings.weekStartsOn])

    const getRankDisplay = (rank: number) => {
      switch (rank) {
        case 1:
          return <span className="text-2xl leading-none">🥇</span>
        case 2:
          return <span className="text-2xl leading-none">🥈</span>
        case 3:
          return <span className="text-2xl leading-none">🥉</span>
        default:
          return (
            <span className="text-xl font-semibold text-gray-500 dark:text-gray-400">
              {rank}.
            </span>
          )
      }
    }

    return (
      <div
        ref={ref}
        data-export-target="monthly"
        className="flex flex-col min-h-full"
      >
        <div className="mb-4 border-b border-gray-200 dark:border-white/10 pb-6">
          <h2 className="text-4xl font-bold text-red-500">
            {MONTH_NAMES[month]} {year}
          </h2>
        </div>

        <div className="mb-6">
          <div className="grid grid-cols-7 gap-0 mb-1">
            {dayLabels.map((day) => (
              <div
                key={day}
                className="text-center text-xs text-gray-500 dark:text-gray-400 font-medium py-1"
              >
                {day}
              </div>
            ))}
          </div>
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-0">
              {week.map((date, dayIndex) => {
                if (!date) {
                  return <div key={dayIndex} className="aspect-square p-1" />
                }

                const cellVisits = getVisitsForDate(date, monthVisits)
                const hasVisits = cellVisits.length > 0
                const hasTwoCountries = cellVisits.length === 2

                return (
                  <div
                    key={dayIndex}
                    className="aspect-square p-0.5 flex items-center justify-center"
                  >
                    <div className="flex items-center justify-center w-full h-full">
                      {hasVisits ? (
                        hasTwoCountries ? (
                          <div className="relative w-8 h-6">
                            <div
                              className="absolute inset-0 flex items-center justify-center overflow-hidden"
                              style={{
                                clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                              }}
                            >
                              <Flag
                                countryCode={cellVisits[0].countryCode}
                                displayMode={settings.flagDisplayMode}
                              />
                            </div>
                            <div
                              className="absolute inset-0 flex items-center justify-center overflow-hidden"
                              style={{
                                clipPath:
                                  'polygon(100% 0, 100% 100%, 0 100%)',
                              }}
                            >
                              <Flag
                                countryCode={cellVisits[1].countryCode}
                                displayMode={settings.flagDisplayMode}
                              />
                            </div>
                          </div>
                        ) : (
                          <Flag
                            displayMode={settings.flagDisplayMode}
                            countryCode={cellVisits[0].countryCode}
                          />
                        )
                      ) : (
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {date.getDate()}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="stat-card p-5 rounded-2xl border bg-gray-100 dark:bg-white/5">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Countries Visited
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.totalCountries}
            </p>
          </div>

          <div className="stat-card p-5 rounded-2xl border bg-gray-100 dark:bg-white/5">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Days Abroad
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.totalDays}
            </p>
          </div>

          <div className="stat-card p-5 rounded-2xl border bg-gray-100 dark:bg-white/5">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
              Average Trip
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.averageTripLength.toFixed(1)}
              <span className="text-lg font-normal text-gray-500 dark:text-gray-400 ml-1">
                days
              </span>
            </p>
          </div>

          {stats.totalDays > 0 && (
            <div className="stat-card p-5 rounded-2xl border bg-gray-100 dark:bg-white/5">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Month Abroad
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.percentTraveled.toFixed(1)}%
              </p>
            </div>
          )}
        </div>

        {stats.countriesByDays.length > 0 && (
          <div className="flex-1">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Top Countries
            </h3>
            <div className="space-y-3">
              {stats.countriesByDays.map((item, index) => {
                const country = getCountryByCode(item.countryCode)
                const countryName = country?.name || item.countryCode

                return (
                  <div
                    key={item.countryCode}
                    className="flex items-center gap-4 p-4 border rounded-2xl bg-gray-100 dark:bg-white/5"
                  >
                    <div className="w-10 flex items-center justify-center shrink-0">
                      {getRankDisplay(index + 1)}
                    </div>
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-8 h-6 flex items-center shrink-0">
                        <Flag
                          countryCode={item.countryCode}
                          displayMode={settings.flagDisplayMode}
                          className="text-2xl"
                          size="lg"
                        />
                      </div>
                      <span className="text-xl font-medium text-gray-900 dark:text-white truncate">
                        {countryName}
                      </span>
                    </div>
                    <span className="px-3 py-1.5 rounded-full bg-gray-200 dark:bg-white/10 text-base font-medium text-gray-600 dark:text-gray-300 shrink-0">
                      {item.days} {item.days === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div
          data-export-watermark
          className="hidden mt-6 pt-4 border-t border-gray-200 dark:border-white/10"
        >
          <p className="text-center text-gray-400 dark:text-gray-500 tracking-wide">
            made with <span className="font-medium">yearly.world</span>
          </p>
        </div>
      </div>
    )
  }
)

MonthlyExportLayout.displayName = 'MonthlyExportLayout'

export default MonthlyExportLayout
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/MonthlyExportLayout.tsx
git commit -m "feat: add MonthlyExportLayout component for monthly image export"
```

---

## Chunk 3: Export Hook

### Task 4: Create `useMonthlyExport` hook

**Files:**
- Create: `src/lib/hooks/useMonthlyExport.ts`

This follows the same pattern as `useStatisticsExport` — clone the ref element, apply inline styles for the export dimensions, call `toJpeg`.

- [ ] **Step 1: Create the hook**

Create `src/lib/hooks/useMonthlyExport.ts`:

```typescript
import { useState, useCallback, RefObject } from 'react'
import { toJpeg } from 'html-to-image'
import { useStatusFeedback } from './useStatusFeedback'
import { useSettings } from '@/lib/contexts/SettingsContext'
import { trackEvent } from '@/lib/tracking'
import { MONTH_NAMES } from '@/lib/constants'
import type { CalendarData } from '@/lib/types'

interface UseMonthlyExportOptions {
  monthlyExportRef: RefObject<HTMLDivElement | null>
  calendarData: CalendarData
  year: number
  month: number
}

type ExportSource = 'sidebar' | 'header' | 'mobile_fab'

interface UseMonthlyExportReturn {
  exportMonth: (source?: ExportSource) => Promise<void>
  status: 'idle' | 'loading' | 'success' | 'error'
  previewOpen: boolean
  setPreviewOpen: (open: boolean) => void
  imageDataUrl: string | null
  filename: string
}

export function useMonthlyExport({
  monthlyExportRef,
  calendarData,
  year,
  month,
}: UseMonthlyExportOptions): UseMonthlyExportReturn {
  const { status, setLoading, setIdle, setError } = useStatusFeedback()
  const { settings } = useSettings()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)

  const monthName = MONTH_NAMES[month].toLowerCase()
  const filename = `my-month-${monthName}-${year}.jpg`

  const isDarkMode = useCallback(() => {
    if (settings.colorScheme === 'dark') return true
    if (settings.colorScheme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [settings.colorScheme])

  const exportMonth = useCallback(async (source: ExportSource = 'sidebar') => {
    if (!monthlyExportRef.current) {
      setError()
      return
    }

    trackEvent('monthly_export_click', {
      year,
      month,
      source,
    })

    setLoading()

    let clonedElement: HTMLDivElement | null = null

    try {
      const element = monthlyExportRef.current

      clonedElement = element.cloneNode(true) as HTMLDivElement

      const exportWidth = 1080
      const exportHeight = 1920

      clonedElement.style.position = 'absolute'
      clonedElement.style.left = '0'
      clonedElement.style.top = '0'
      clonedElement.style.width = `${exportWidth}px`
      clonedElement.style.height = `${exportHeight}px`
      clonedElement.style.maxWidth = `${exportWidth}px`
      clonedElement.style.transform = 'none'
      clonedElement.style.zIndex = '-1000'
      clonedElement.style.pointerEvents = 'none'
      clonedElement.style.opacity = '0'
      clonedElement.style.padding = '4rem 3rem'
      clonedElement.style.boxSizing = 'border-box'
      clonedElement.style.display = 'flex'
      clonedElement.style.flexDirection = 'column'

      const darkMode = isDarkMode()
      clonedElement.style.backgroundColor = darkMode ? '#0a0a0a' : '#fafafa'

      if (darkMode) {
        clonedElement.style.color = '#ffffff'
      }

      const watermark = clonedElement.querySelector(
        '[data-export-watermark]'
      ) as HTMLElement
      if (watermark) {
        watermark.style.display = 'block'
        watermark.style.marginTop = 'auto'
        watermark.style.paddingTop = '2rem'
        const watermarkText = watermark.querySelector('p') as HTMLElement
        if (watermarkText) {
          watermarkText.style.fontSize = '1.5rem'
        }
      }

      const allElements = clonedElement.querySelectorAll('*')
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement
        if (htmlEl.classList.contains('text-4xl')) {
          htmlEl.style.fontSize = '5rem'
        }
        if (htmlEl.classList.contains('text-3xl')) {
          htmlEl.style.fontSize = '4rem'
        }
        if (htmlEl.classList.contains('text-2xl')) {
          htmlEl.style.fontSize = '3rem'
        }
        if (htmlEl.classList.contains('text-xl')) {
          htmlEl.style.fontSize = '2rem'
        }
        if (htmlEl.classList.contains('text-lg')) {
          htmlEl.style.fontSize = '1.75rem'
        }
        if (htmlEl.classList.contains('text-base')) {
          htmlEl.style.fontSize = '1.5rem'
        }
        if (htmlEl.classList.contains('text-sm')) {
          htmlEl.style.fontSize = '1.25rem'
        }
        if (htmlEl.classList.contains('text-xs')) {
          htmlEl.style.fontSize = '1.1rem'
        }
        if (htmlEl.classList.contains('rounded-2xl')) {
          htmlEl.style.borderRadius = '2rem'
        }
        if (htmlEl.classList.contains('p-5')) {
          htmlEl.style.padding = '2rem'
        }
        if (htmlEl.classList.contains('p-4')) {
          htmlEl.style.padding = '1.75rem'
        }
        if (htmlEl.classList.contains('gap-4')) {
          htmlEl.style.gap = '1.5rem'
        }
        if (htmlEl.classList.contains('mb-4')) {
          htmlEl.style.marginBottom = '1.5rem'
        }
        if (htmlEl.classList.contains('mb-6')) {
          htmlEl.style.marginBottom = '2.5rem'
        }
        if (htmlEl.classList.contains('space-y-3')) {
          const children = htmlEl.children
          for (let i = 1; i < children.length; i++) {
            ;(children[i] as HTMLElement).style.marginTop = '1.25rem'
          }
        }
        if (htmlEl.classList.contains('rounded-full')) {
          htmlEl.style.borderRadius = '9999px'
        }
        if (htmlEl.classList.contains('px-3')) {
          htmlEl.style.paddingLeft = '1rem'
          htmlEl.style.paddingRight = '1rem'
        }
        if (
          htmlEl.classList.contains('py-1.5') ||
          htmlEl.classList.contains('py-1')
        ) {
          htmlEl.style.paddingTop = '0.5rem'
          htmlEl.style.paddingBottom = '0.5rem'
        }
        if (htmlEl.classList.contains('w-10')) {
          htmlEl.style.width = '3rem'
        }
        if (htmlEl.classList.contains('w-8')) {
          htmlEl.style.width = '2.5rem'
        }
        if (htmlEl.classList.contains('h-6')) {
          htmlEl.style.height = '2rem'
        }
        if (htmlEl.classList.contains('border-b')) {
          htmlEl.style.borderBottomWidth = '2px'
          htmlEl.style.borderBottomStyle = 'solid'
          htmlEl.style.borderBottomColor = darkMode
            ? 'rgba(255, 255, 255, 0.1)'
            : '#e5e7eb'
        }
        if (htmlEl.classList.contains('border-t')) {
          htmlEl.style.borderTopWidth = '2px'
          htmlEl.style.borderTopStyle = 'solid'
          htmlEl.style.borderTopColor = darkMode
            ? 'rgba(255, 255, 255, 0.1)'
            : '#e5e7eb'
        }
        if (htmlEl.classList.contains('pb-6')) {
          htmlEl.style.paddingBottom = '2rem'
        }
        if (htmlEl.classList.contains('pt-6')) {
          htmlEl.style.paddingTop = '2rem'
        }
      })

      document.body.appendChild(clonedElement)

      await new Promise((resolve) => setTimeout(resolve, 300))

      const dataUrl = await toJpeg(clonedElement, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: darkMode ? '#0a0a0a' : '#fafafa',
        cacheBust: true,
        width: exportWidth,
        height: exportHeight,
        style: {
          transform: 'scale(1)',
          opacity: '1',
        },
      })

      document.body.removeChild(clonedElement)
      clonedElement = null

      setImageDataUrl(dataUrl)
      setPreviewOpen(true)
      setIdle()
    } catch (error) {
      console.error('Monthly export failed:', error)

      if (clonedElement && document.body.contains(clonedElement)) {
        document.body.removeChild(clonedElement)
      }

      setError()
    }
  }, [
    monthlyExportRef,
    calendarData,
    year,
    month,
    isDarkMode,
    setLoading,
    setIdle,
    setError,
  ])

  return {
    exportMonth,
    status,
    previewOpen,
    setPreviewOpen,
    imageDataUrl,
    filename,
  }
}
```

- [ ] **Step 2: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/useMonthlyExport.ts
git commit -m "feat: add useMonthlyExport hook for monthly image export"
```

---

## Chunk 4: UI Integration

### Task 5: Add month header download shortcut to CalendarGrid/MonthGrid

**Files:**
- Modify: `src/components/CalendarGrid.tsx:12-46`
- Modify: `src/components/MonthGrid.tsx:9-55`

- [ ] **Step 1: Add `onMonthExport` prop to CalendarGrid**

In `src/components/CalendarGrid.tsx`, add the prop to the interface and pass it through:

Add to `CalendarGridProps` interface (after line 11):
```typescript
  onMonthExport?: (month: number) => void
```

Update the forwardRef destructuring (line 13) to include `onMonthExport`:
```typescript
  ({ year, calendarData, onRemoveVisit, onMonthExport }, ref) => {
```

Pass `onMonthExport` to each `MonthGrid` (line 26-31), adding:
```tsx
              onExport={onMonthExport ? () => onMonthExport(month) : undefined}
```

- [ ] **Step 2: Add download icon to MonthGrid month header**

In `src/components/MonthGrid.tsx`, add `Download` icon import from lucide-react:
```typescript
import { Download } from 'lucide-react'
```

Add `onExport` to `MonthGridProps`:
```typescript
  onExport?: () => void
```

Update the destructuring to include `onExport`.

Replace the `<h3>` month header (lines 29-33) with a group that shows a download icon on hover:

```tsx
      <div className="flex items-center gap-1 group/month-header">
        <h3
          id={`month-${year}-${month}`}
          className="text-base sm:text-xl font-bold text-gray-900 dark:text-white mb-1 sm:mb-2 ps-1 sm:ps-3 lg:ps-4"
        >
          {MONTH_NAMES_SHORT[month]}
        </h3>
        {onExport && (
          <button
            onClick={onExport}
            className="hidden sm:flex opacity-0 group-hover/month-header:opacity-100 transition-opacity items-center justify-center size-5 sm:size-6 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer mb-1 sm:mb-2"
            aria-label={`Download ${MONTH_NAMES_SHORT[month]} as image`}
          >
            <Download className="size-3 sm:size-4" />
          </button>
        )}
      </div>
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/CalendarGrid.tsx src/components/MonthGrid.tsx
git commit -m "feat: add download icon shortcut on month headers"
```

### Task 6: Add monthly export FAB button to MobileFab

**Files:**
- Modify: `src/components/MobileFab.tsx:1-144`

- [ ] **Step 1: Add props and handler**

Add `CalendarDays` to the lucide-react import (line 5):
```typescript
import { Calendar, CalendarDays, BarChart3, Loader2, Plus, X } from 'lucide-react'
```

Keep `ExportType` unchanged (monthly export opens a dialog, not an async export — no loading state needed).

Add to `MobileFabProps` interface:
```typescript
  onExportMonthClick: () => void
```

Update the destructuring to include `onExportMonthClick`.

Add handler after `handleExportStatsClick` (after line 60):

```typescript
  const handleExportMonthClick = () => {
    setIsExpanded(false)
    onExportMonthClick()
  }
```

- [ ] **Step 2: Add the FAB button**

Add a new FAB entry inside the `{hasVisits && ( ... )}` block, before the stats button (after line 67):

```tsx
              <div className="flex items-center gap-2 me-1 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <span className="bg-gray-900 text-white text-sm px-3 py-1.5 rounded-full shadow-lg">
                  Download Month
                </span>
                <Button
                  className="size-12 rounded-full shadow-lg"
                  size="icon"
                  variant="secondary"
                  onClick={handleExportMonthClick}
                  disabled={isExporting}
                  aria-label="Download month image"
                >
                  <CalendarDays className="size-5" />
                </Button>
              </div>
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/MobileFab.tsx
git commit -m "feat: add monthly export button to mobile FAB menu"
```

### Task 7: Wire everything in `create/page.tsx`

**Files:**
- Modify: `src/app/create/page.tsx`

This is the main wiring task. It connects the new components, hooks, state, sidebar UI, and dialogs.

- [ ] **Step 1: Add imports**

Add these imports to `src/app/create/page.tsx`:

```typescript
import MonthlyExportLayout from '@/components/MonthlyExportLayout'
import { useMonthlyExport } from '@/lib/hooks/useMonthlyExport'
import { MONTH_NAMES } from '@/lib/constants'
import { CalendarDays } from 'lucide-react'
```

Also add `Select`-related imports if not already imported (they are — `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` are already imported).

- [ ] **Step 2: Add state and refs**

Inside the `Create` function, after the existing `statisticsRef` (line 53), add:

```typescript
  const monthlyExportRef = useRef<HTMLDivElement>(null)
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  )
  const [isMobileMonthDialogOpen, setIsMobileMonthDialogOpen] = useState(false)
```

- [ ] **Step 3: Wire up useMonthlyExport hook**

After the existing `useStatisticsExport` call (line 69), add:

```typescript
  const {
    exportMonth,
    previewOpen: monthlyPreviewOpen,
    setPreviewOpen: setMonthlyPreviewOpen,
    imageDataUrl: monthlyImageDataUrl,
    filename: monthlyFilename,
  } = useMonthlyExport({
    monthlyExportRef,
    calendarData,
    year: selectedYear,
    month: selectedMonth,
  })
```

- [ ] **Step 4: Add month header export handler**

After `handleResetCalendar` (line 129), add a ref-based pending export mechanism that avoids the stale closure problem:

```typescript
  const pendingMonthExport = useRef<{ month: number; source: 'header' } | null>(null)

  const handleMonthExport = useCallback(
    (month: number) => {
      setSelectedMonth(month)
      pendingMonthExport.current = { month, source: 'header' }
    },
    []
  )
```

Then add a `useEffect` that fires the export after the component re-renders with the new month:

```typescript
  useEffect(() => {
    if (pendingMonthExport.current && pendingMonthExport.current.month === selectedMonth) {
      const { source } = pendingMonthExport.current
      pendingMonthExport.current = null
      exportMonth(source)
    }
  }, [selectedMonth, exportMonth])
```

This ensures `MonthlyExportLayout` has re-rendered with the new month before `exportMonth` reads the ref. No `setTimeout` needed.

- [ ] **Step 5: Pass `onMonthExport` to CalendarGrid**

Update the `CalendarGrid` component (around line 166-171) to add the prop:

```tsx
                  <CalendarGrid
                    ref={calendarRef}
                    year={selectedYear}
                    calendarData={calendarData}
                    onRemoveVisit={handleRemoveVisit}
                    onMonthExport={handleMonthExport}
                  />
```

- [ ] **Step 6: Update sidebar export card**

Replace the export card section (lines 206-231). Change the title from "Export Your Year" to "Export" and add the monthly export UI below a divider:

```tsx
              {visitsForSelectedYear > 0 && (
                <DarkCard>
                  <CardHeader>
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                      <span className="text-2xl">📸</span>
                      Export
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        Download high-quality images to share
                      </p>
                      <CalendarExportButton
                        calendarRef={calendarRef}
                        calendarData={calendarData}
                        year={selectedYear}
                      />
                      <StatisticsExportButton
                        statisticsRef={statisticsRef}
                        calendarData={calendarData}
                        year={selectedYear}
                      />
                      <div className="border-t border-white/10 dark:border-gray-200/10 pt-3">
                        <div className="flex gap-2">
                          <Select
                            value={selectedMonth.toString()}
                            onValueChange={(v) => setSelectedMonth(Number(v))}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTH_NAMES.map((name, i) => (
                                <SelectItem key={i} value={i.toString()}>
                                  {name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={exportMonth}
                            variant="cta"
                            size="lg"
                            className="whitespace-nowrap"
                          >
                            <CalendarDays className="size-5" />
                            Download Month
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </DarkCard>
              )}
```

- [ ] **Step 7: Render MonthlyExportLayout (hidden)**

After the `CalendarGrid` card (around line 173, inside the main column `<div className="space-y-6">`), add the hidden export layout:

```tsx
              <div className="hidden">
                <MonthlyExportLayout
                  ref={monthlyExportRef}
                  calendarData={calendarData}
                  year={selectedYear}
                  month={selectedMonth}
                />
              </div>
```

- [ ] **Step 8: Wire MobileFab**

Update the `MobileFab` component (around line 292-297) to add the new prop:

```tsx
          <MobileFab
            onAddClick={() => setIsMobileAddDialogOpen(true)}
            onExportClick={exportImage}
            onExportStatsClick={exportStatistics}
            onExportMonthClick={() => setIsMobileMonthDialogOpen(true)}
            hasVisits={visitsForSelectedYear > 0}
          />
```

- [ ] **Step 9: Add mobile month picker dialog**

After the existing mobile add dialog (around line 320), add:

```tsx
      <Dialog
        open={isMobileMonthDialogOpen}
        onOpenChange={setIsMobileMonthDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">📅</span>
              Download Month
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Select
              value={selectedMonth.toString()}
              onValueChange={(v) => setSelectedMonth(Number(v))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTH_NAMES.map((name, i) => (
                  <SelectItem key={i} value={i.toString()}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                setIsMobileMonthDialogOpen(false)
                exportMonth()
              }}
              variant="cta"
              size="lg"
              className="w-full"
            >
              <CalendarDays className="size-5" />
              Download Month
            </Button>
          </div>
        </DialogContent>
      </Dialog>
```

- [ ] **Step 10: Add ImagePreviewModal for monthly export**

After the existing stats `ImagePreviewModal` (around line 338), add:

```tsx
      <ImagePreviewModal
        open={monthlyPreviewOpen}
        onOpenChange={setMonthlyPreviewOpen}
        imageDataUrl={monthlyImageDataUrl}
        filename={monthlyFilename}
        year={selectedYear}
        calendarData={calendarData}
      />
```

- [ ] **Step 11: Verify types compile**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 12: Run all existing tests**

Run: `npx vitest run`
Expected: All tests pass (no regressions)

- [ ] **Step 13: Commit**

```bash
git add src/app/create/page.tsx
git commit -m "feat: wire monthly export into create page UI"
```

---

## Chunk 5: Manual Verification

### Task 8: End-to-end manual testing

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify sidebar export card**

Navigate to `/create`, add some visits across multiple months. Verify:
- Export card title says "Export" (not "Export Your Year")
- Month picker dropdown appears below the divider with all 12 months
- "Download Month" button appears next to the dropdown
- Selecting a month and clicking "Download Month" generates a preview modal with the monthly image

- [ ] **Step 3: Verify exported image content**

Check the preview modal image:
- Month + year header is left-aligned, red, bold
- Calendar grid shows the correct month with flags
- 2x2 stats grid shows Countries, Days, Avg Trip, Month Abroad %
- Top Countries ranking with medals appears
- Watermark "made with yearly.world" at bottom
- Both dark and light mode produce correct images

- [ ] **Step 4: Verify month header shortcut**

On desktop, hover over a month name in the calendar grid:
- Small download icon appears
- Clicking it triggers export for that specific month
- Preview modal opens

- [ ] **Step 5: Verify mobile FAB**

Use responsive mode (375px width) in browser dev tools:
- New "Download Month" FAB appears in the expanded menu
- Tapping it opens a dialog with month picker
- Selecting month and tapping download generates the image

- [ ] **Step 6: Run lint**

Run: `npm run lint`
Expected: No lint errors

- [ ] **Step 7: Run production build**

Run: `npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 8: Final commit if any fixes needed**

If any issues were found and fixed during manual testing, commit those fixes.
