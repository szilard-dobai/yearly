import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LONG_PRESS_MS } from '@/lib/hooks/useDayGestures'
import type { DaySelection } from '@/lib/selection'
import { renderWithSettings } from '@/test/test-utils'
import CalendarGrid from './CalendarGrid'

function Harness() {
  const [selection, setSelection] = useState<DaySelection | null>(null)
  return (
    <>
      <CalendarGrid
        year={2026}
        calendarData={{ visits: [] }}
        selection={selection}
        onSelectionChange={setSelection}
      />
      <output data-testid="selection">
        {selection
          ? `${selection.anchor}|${selection.focus}|${selection.method}`
          : 'none'}
      </output>
    </>
  )
}

const day = (key: string) => {
  const element = document.querySelector<HTMLElement>(`[data-day="${key}"]`)
  if (!element) throw new Error(`No day ${key}`)
  return element
}

const selectionText = () => screen.getByTestId('selection').textContent

function dispatch(
  target: EventTarget,
  type: string,
  props: Record<string, unknown> = {}
) {
  const event = new Event(type, { bubbles: true, cancelable: true })
  for (const [key, value] of Object.entries(props)) {
    Object.defineProperty(event, key, { value })
  }
  act(() => {
    target.dispatchEvent(event)
  })
  return event
}

const touchAt = (x: number, y: number) => ({
  touches: [{ clientX: x, clientY: y }],
})

describe('CalendarGrid day selection', () => {
  describe('tapping', () => {
    it('selects a day, extends to a range, and starts over', async () => {
      const user = userEvent.setup()
      renderWithSettings(<Harness />)

      await user.click(day('2026-03-05'))
      expect(selectionText()).toBe('2026-03-05|2026-03-05|tap')

      await user.click(day('2026-03-12'))
      expect(selectionText()).toBe('2026-03-05|2026-03-12|tap')

      await user.click(day('2026-04-01'))
      expect(selectionText()).toBe('2026-04-01|2026-04-01|tap')
    })

    it('clears when the selected day is tapped again', async () => {
      const user = userEvent.setup()
      renderWithSettings(<Harness />)

      await user.click(day('2026-03-05'))
      await user.click(day('2026-03-05'))

      expect(selectionText()).toBe('none')
    })

    it('can be used with the keyboard', async () => {
      const user = userEvent.setup()
      renderWithSettings(<Harness />)

      day('2026-06-10').focus()
      await user.keyboard('{Enter}')

      expect(selectionText()).toBe('2026-06-10|2026-06-10|tap')
    })

    it('highlights the selected range', async () => {
      const user = userEvent.setup()
      renderWithSettings(<Harness />)

      await user.click(day('2026-03-05'))
      await user.click(day('2026-03-07'))

      expect(day('2026-03-05')).toHaveAttribute('data-edge')
      expect(day('2026-03-06')).not.toHaveAttribute('data-edge')
      expect(day('2026-03-06').closest('[role="gridcell"]')).toHaveAttribute(
        'aria-selected',
        'true'
      )
      expect(day('2026-03-08').closest('[role="gridcell"]')).toHaveAttribute(
        'aria-selected',
        'false'
      )
    })
  })

  describe('keyboard', () => {
    it('exposes a single tab stop that follows the selection', async () => {
      const user = userEvent.setup()
      renderWithSettings(<Harness />)

      const tabbable = () =>
        document.querySelectorAll('[data-day][tabindex="0"]')
      expect(tabbable()).toHaveLength(1)

      await user.click(day('2026-08-20'))

      expect(tabbable()).toHaveLength(1)
      expect(day('2026-08-20')).toHaveAttribute('tabindex', '0')
    })

    it('moves between days with the arrow keys, across months', async () => {
      const user = userEvent.setup()
      renderWithSettings(<Harness />)

      day('2026-01-31').focus()
      await user.keyboard('{ArrowRight}')
      expect(day('2026-02-01')).toHaveFocus()

      await user.keyboard('{ArrowDown}')
      expect(day('2026-02-08')).toHaveFocus()

      await user.keyboard('{ArrowUp}{ArrowLeft}')
      expect(day('2026-01-31')).toHaveFocus()
    })

    it('stays put at the edge of the year', async () => {
      const user = userEvent.setup()
      renderWithSettings(<Harness />)

      day('2026-12-31').focus()
      await user.keyboard('{ArrowRight}')

      expect(day('2026-12-31')).toHaveFocus()
    })
  })

  describe('mouse drag', () => {
    it('selects the range swept over and swallows the trailing click', async () => {
      const user = userEvent.setup()
      renderWithSettings(<Harness />)

      dispatch(day('2026-03-05'), 'pointerdown', {
        pointerType: 'mouse',
        button: 0,
        buttons: 1,
      })
      dispatch(day('2026-03-06'), 'pointerover', {
        pointerType: 'mouse',
        buttons: 1,
      })
      dispatch(day('2026-03-09'), 'pointerover', {
        pointerType: 'mouse',
        buttons: 1,
      })
      dispatch(window, 'pointerup', { pointerType: 'mouse' })
      dispatch(day('2026-03-09'), 'click')

      expect(selectionText()).toBe('2026-03-05|2026-03-09|drag')

      await user.click(day('2026-05-01'))
      expect(selectionText()).toBe('2026-05-01|2026-05-01|tap')
    })

    it('ignores hovering without the button held', () => {
      renderWithSettings(<Harness />)

      dispatch(day('2026-03-05'), 'pointerdown', {
        pointerType: 'mouse',
        button: 0,
        buttons: 1,
      })
      dispatch(day('2026-03-06'), 'pointerover', {
        pointerType: 'mouse',
        buttons: 0,
      })

      expect(selectionText()).toBe('none')
    })
  })

  describe('touch press-and-hold drag', () => {
    const originalElementFromPoint = document.elementFromPoint

    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
      document.elementFromPoint = originalElementFromPoint
    })

    it('starts after a hold, follows the finger, and blocks scrolling', () => {
      renderWithSettings(<Harness />)

      dispatch(day('2026-03-05'), 'touchstart', touchAt(10, 10))
      expect(selectionText()).toBe('none')

      act(() => {
        vi.advanceTimersByTime(LONG_PRESS_MS)
      })
      expect(selectionText()).toBe('2026-03-05|2026-03-05|long_press')

      document.elementFromPoint = vi.fn(() => day('2026-03-11'))
      const move = dispatch(day('2026-03-05'), 'touchmove', touchAt(80, 60))
      expect(move.defaultPrevented).toBe(true)
      expect(selectionText()).toBe('2026-03-05|2026-03-11|long_press')

      const end = dispatch(day('2026-03-05'), 'touchend')
      expect(end.defaultPrevented).toBe(true)
      dispatch(day('2026-03-05'), 'click')
      expect(selectionText()).toBe('2026-03-05|2026-03-11|long_press')
    })

    it('lets the page scroll when the finger moves before the hold', () => {
      renderWithSettings(<Harness />)

      dispatch(day('2026-03-05'), 'touchstart', touchAt(10, 10))
      const move = dispatch(day('2026-03-05'), 'touchmove', touchAt(10, 40))
      act(() => {
        vi.advanceTimersByTime(LONG_PRESS_MS * 2)
      })

      expect(move.defaultPrevented).toBe(false)
      expect(selectionText()).toBe('none')
    })

    it('treats a quick touch as a tap', () => {
      renderWithSettings(<Harness />)

      dispatch(day('2026-03-05'), 'touchstart', touchAt(10, 10))
      const end = dispatch(day('2026-03-05'), 'touchend')
      dispatch(day('2026-03-05'), 'click')

      expect(end.defaultPrevented).toBe(false)
      expect(selectionText()).toBe('2026-03-05|2026-03-05|tap')
    })

    it('ignores multi-touch gestures such as pinch zoom', () => {
      renderWithSettings(<Harness />)

      dispatch(day('2026-03-05'), 'touchstart', {
        touches: [
          { clientX: 10, clientY: 10 },
          { clientX: 50, clientY: 50 },
        ],
      })
      act(() => {
        vi.advanceTimersByTime(LONG_PRESS_MS * 2)
      })

      expect(selectionText()).toBe('none')
    })
  })

  it('does not react to gestures when selection is not enabled', async () => {
    const user = userEvent.setup()
    renderWithSettings(
      <CalendarGrid year={2026} calendarData={{ visits: [] }} />
    )

    await user.click(day('2026-03-05'))

    expect(day('2026-03-05')).not.toHaveAttribute('data-edge')
  })
})
