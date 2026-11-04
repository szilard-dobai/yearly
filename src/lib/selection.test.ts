import { describe, expect, it } from 'vitest'
import {
  applyTap,
  formatSelectionLabel,
  fromDayKey,
  getMonthSelection,
  getSelectionBounds,
  getSelectionDays,
  isSingleDay,
  toDayKey,
  type DaySelection,
} from './selection'

const select = (
  anchor: string,
  focus: string,
  method: DaySelection['method'] = 'tap'
): DaySelection => ({ anchor, focus, method })

describe('day keys', () => {
  it('round-trips a local date through a key', () => {
    const date = new Date(2026, 2, 5)
    expect(toDayKey(date)).toBe('2026-03-05')
    expect(fromDayKey('2026-03-05')).toEqual(date)
  })

  it('ignores the time of day', () => {
    expect(toDayKey(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31')
  })
})

describe('getSelectionBounds', () => {
  it('orders bounds when dragging backwards', () => {
    expect(getSelectionBounds(select('2026-03-10', '2026-03-02'))).toEqual({
      startKey: '2026-03-02',
      endKey: '2026-03-10',
    })
  })
})

describe('getSelectionDays', () => {
  it('returns every day in the range inclusive', () => {
    const days = getSelectionDays(select('2026-02-27', '2026-03-02'))
    expect(days.map(toDayKey)).toEqual([
      '2026-02-27',
      '2026-02-28',
      '2026-03-01',
      '2026-03-02',
    ])
  })

  it('returns a single day for a single selection', () => {
    expect(getSelectionDays(select('2026-03-05', '2026-03-05'))).toHaveLength(1)
  })

  it('handles daylight saving transitions without skipping days', () => {
    const days = getSelectionDays(select('2026-03-27', '2026-04-01'))
    expect(days.map(toDayKey)).toEqual([
      '2026-03-27',
      '2026-03-28',
      '2026-03-29',
      '2026-03-30',
      '2026-03-31',
      '2026-04-01',
    ])
  })
})

describe('applyTap', () => {
  it('starts a selection on the first tap', () => {
    expect(applyTap(null, '2026-03-05')).toEqual(
      select('2026-03-05', '2026-03-05')
    )
  })

  it('extends a single-day selection into a range', () => {
    expect(applyTap(select('2026-03-05', '2026-03-05'), '2026-03-12')).toEqual(
      select('2026-03-05', '2026-03-12')
    )
  })

  it('extends backwards when tapping an earlier day', () => {
    const next = applyTap(select('2026-03-05', '2026-03-05'), '2026-03-01')
    expect(next && getSelectionBounds(next)).toEqual({
      startKey: '2026-03-01',
      endKey: '2026-03-05',
    })
  })

  it('clears when tapping the selected day again', () => {
    expect(applyTap(select('2026-03-05', '2026-03-05'), '2026-03-05')).toBe(
      null
    )
  })

  it('starts over when a range is already selected', () => {
    expect(
      applyTap(select('2026-03-05', '2026-03-12', 'drag'), '2026-04-01')
    ).toEqual(select('2026-04-01', '2026-04-01'))
  })
})

describe('getMonthSelection', () => {
  it('covers the whole month including leap days', () => {
    expect(getMonthSelection(2024, 1)).toEqual(
      select('2024-02-01', '2024-02-29', 'month')
    )
  })

  it('covers December', () => {
    expect(getMonthSelection(2026, 11)).toEqual(
      select('2026-12-01', '2026-12-31', 'month')
    )
  })
})

describe('isSingleDay', () => {
  it('is true only when anchor and focus match', () => {
    expect(isSingleDay(select('2026-03-05', '2026-03-05'))).toBe(true)
    expect(isSingleDay(select('2026-03-05', '2026-03-06'))).toBe(false)
  })
})

describe('formatSelectionLabel', () => {
  it('formats a single day with its weekday', () => {
    expect(formatSelectionLabel(select('2026-03-05', '2026-03-05'))).toBe(
      'Thu, Mar 5'
    )
  })

  it('omits the repeated month within one month', () => {
    expect(formatSelectionLabel(select('2026-03-12', '2026-03-05'))).toBe(
      'Mar 5 – 12'
    )
  })

  it('shows both months when the range spans months', () => {
    expect(formatSelectionLabel(select('2026-03-28', '2026-04-02'))).toBe(
      'Mar 28 – Apr 2'
    )
  })
})
