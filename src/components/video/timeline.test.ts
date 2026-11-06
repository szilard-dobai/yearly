import { describe, expect, it } from 'vitest'
import { monthTimeline } from './MonthVideo'
import {
  FILL_START,
  FRAMES_PER_DAY,
  fillLength,
  revealFrames,
} from './timeline'
import { yearFillTimeline } from './YearFillVideo'

const day = (date: string) => ({ date, codes: ['JP'] })

describe('revealFrames', () => {
  it('reveals visited days one after another, skipping the gaps between them', () => {
    const frames = revealFrames(
      [
        day('2026-01-02'),
        day('2026-07-20'),
        day('2026-07-21'),
        day('2026-12-30'),
      ],
      FILL_START,
      4 * FRAMES_PER_DAY
    ).map((r) => r.frame)

    expect(frames).toEqual([
      FILL_START,
      FILL_START + FRAMES_PER_DAY,
      FILL_START + 2 * FRAMES_PER_DAY,
      FILL_START + 3 * FRAMES_PER_DAY,
    ])
  })
})

describe('fillLength', () => {
  it('gives each visited day the same time, within limits', () => {
    expect(fillLength(10, 30, 180)).toBe(10 * FRAMES_PER_DAY)
    expect(fillLength(1, 30, 180)).toBe(30)
    expect(fillLength(300, 30, 180)).toBe(180)
  })
})

describe('video timelines', () => {
  it('shortens the year video when there are few trips', () => {
    expect(yearFillTimeline(8).duration).toBeLessThan(
      yearFillTimeline(200).duration
    )
    expect(yearFillTimeline(200).duration).toBe(400)
  })

  it('shortens the month video when there are few trips', () => {
    const short = monthTimeline(5)
    expect(short.fillEnd).toBe(FILL_START + 30)
    expect(short.duration).toBeLessThan(monthTimeline(31).duration)
    expect(monthTimeline(31).duration).toBe(400)
  })
})
