import { monthTimeline } from '@/components/video/MonthVideo'
import { STATS_DURATION } from '@/components/video/StatsVideo'
import { FPS, VIDEO_HEIGHT, VIDEO_WIDTH } from '@/components/video/tokens'
import { yearFillTimeline } from '@/components/video/YearFillVideo'
import { VIDEO_KINDS } from '@/lib/video'
import { render } from '@testing-library/react'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { Root } from './Root'

type Registered = {
  id: string
  width: number
  height: number
  fps: number
  durationInFrames: number
  defaultProps: { data: { days: unknown[] } }
  calculateMetadata?: (input: { props: { data: { days: unknown[] } } }) => {
    durationInFrames: number
  }
}

const registered = vi.hoisted(() => [] as Registered[])

vi.mock('remotion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('remotion')>()),
  Composition: (props: Registered) => {
    registered.push(props)
    return null
  },
}))

function durationFor(composition: Registered, dayCount: number) {
  const props = { data: { days: Array.from({ length: dayCount }) } }
  return (
    composition.calculateMetadata?.({ props }).durationInFrames ??
    composition.durationInFrames
  )
}

describe('Root', () => {
  let byId: Record<string, Registered>

  beforeAll(() => {
    render(<Root />)
    byId = Object.fromEntries(registered.map((c) => [c.id, c]))
  })

  it('registers one composition per video kind, named after it', () => {
    expect(registered.map((c) => c.id).sort()).toEqual([...VIDEO_KINDS].sort())
  })

  it('renders at the preview size and frame rate', () => {
    for (const composition of registered) {
      expect(composition).toMatchObject({
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,
        fps: FPS,
      })
    }
  })

  it('lasts as long as the preview for the trips it is given', () => {
    expect(durationFor(byId.year, 40)).toBe(yearFillTimeline(40).duration)
    expect(durationFor(byId.month, 9)).toBe(monthTimeline(9).duration)
    expect(durationFor(byId.stats, 40)).toBe(STATS_DURATION)
  })

  it('defaults to the homepage example year', () => {
    expect(byId.year.defaultProps.data.days.length).toBeGreaterThan(0)
    expect(byId.month.defaultProps.data.days.length).toBeGreaterThan(0)
  })
})
