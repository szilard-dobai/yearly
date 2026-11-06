import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toDayKey, type DaySelection } from '@/lib/selection'
import type { CountryVisit } from '@/lib/types'
import { renderWithSettings } from '@/test/test-utils'
import DaySelectionPanel from './DaySelectionPanel'

let nextId = 0
const visit = (
  countryCode: string,
  month: number,
  day: number
): CountryVisit => ({
  id: `v${nextId++}`,
  countryCode,
  date: new Date(2026, month, day),
})

const range = (anchor: string, focus: string): DaySelection => ({
  anchor,
  focus,
  method: 'tap',
})

describe('DaySelectionPanel', () => {
  const onAdd = vi.fn()
  const onRemove = vi.fn()
  const onReorder = vi.fn()
  const onClose = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['en-GB'])
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function renderPanel(selection: DaySelection, visits: CountryVisit[] = []) {
    return renderWithSettings(
      <DaySelectionPanel
        selection={selection}
        visits={visits}
        year={2026}
        onAdd={onAdd}
        onRemove={onRemove}
        onReorder={onReorder}
        onClose={onClose}
      />
    )
  }

  const addedDayKeys = () => (onAdd.mock.calls[0][1] as Date[]).map(toDayKey)

  it('summarises a range', () => {
    renderPanel(range('2026-03-12', '2026-03-05'))

    expect(screen.getByText('Mar 5 – 12')).toBeInTheDocument()
    expect(screen.getByText('8 days')).toBeInTheDocument()
  })

  it('prompts for an end day when a single day is selected', () => {
    renderPanel(range('2026-03-05', '2026-03-05'))

    expect(screen.getByText('Thu, Mar 5')).toBeInTheDocument()
    expect(
      screen.getByText('Pick another day to select a whole trip')
    ).toBeInTheDocument()
  })

  it('suggests the browser locale country when there is no history', () => {
    renderPanel(range('2026-03-05', '2026-03-05'))

    expect(
      screen.getByRole('button', { name: 'Add United Kingdom' })
    ).toBeInTheDocument()
  })

  it('adds a suggested country to every selected day', async () => {
    const user = userEvent.setup()
    renderPanel(range('2026-03-05', '2026-03-07'), [visit('FR', 2, 4)])

    await user.click(screen.getByRole('button', { name: 'Add France' }))

    expect(onAdd).toHaveBeenCalledWith('FR', expect.any(Array), {
      suggested: true,
      emptyOnly: false,
    })
    expect(addedDayKeys()).toEqual(['2026-03-05', '2026-03-06', '2026-03-07'])
  })

  it('can fill only the empty days of a range', async () => {
    const user = userEvent.setup()
    renderPanel(range('2026-03-05', '2026-03-07'), [visit('FR', 2, 6)])

    await user.click(screen.getByRole('button', { name: '2 empty' }))
    expect(screen.getByRole('button', { name: '2 empty' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    await user.click(screen.getByRole('button', { name: 'Add United Kingdom' }))

    expect(addedDayKeys()).toEqual(['2026-03-05', '2026-03-07'])
    expect(onAdd.mock.calls[0][2]).toEqual({ suggested: true, emptyOnly: true })
  })

  it('hides the empty-days choice when it would make no difference', () => {
    renderPanel(range('2026-03-05', '2026-03-07'))

    expect(
      screen.queryByRole('group', { name: 'Which days to fill' })
    ).not.toBeInTheDocument()
  })

  it('lists countries already on the selected days and removes one', async () => {
    const user = userEvent.setup()
    renderPanel(range('2026-03-05', '2026-03-07'), [
      visit('FR', 2, 5),
      visit('FR', 2, 6),
      visit('IT', 2, 7),
    ])

    const list = screen.getByRole('list')
    expect(within(list).getByText('France')).toBeInTheDocument()
    expect(within(list).getByText('2d')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Remove France from these days' })
    )

    expect(onRemove).toHaveBeenCalledWith(expect.any(Array), 'FR')
    expect((onRemove.mock.calls[0][0] as Date[]).map(toDayKey)).toEqual([
      '2026-03-05',
      '2026-03-06',
      '2026-03-07',
    ])
  })

  describe('reordering the two countries on a day', () => {
    const travelDay = () => [visit('MX', 4, 23), visit('AD', 4, 23)]

    it('shows the countries as sortable chips in stored order', () => {
      renderPanel(range('2026-05-23', '2026-05-23'), travelDay())

      const chips = screen.getAllByRole('listitem')
      expect(chips.map((chip) => chip.getAttribute('aria-label'))).toEqual([
        'Mexico, 1 of 2',
        'Andorra, 2 of 2',
      ])
      expect(chips[0]).toHaveAccessibleDescription(/arrow keys/)
    })

    it('moves a country first with the arrow keys', async () => {
      const user = userEvent.setup()
      renderPanel(range('2026-05-23', '2026-05-23'), travelDay())

      screen.getByRole('listitem', { name: 'Andorra, 2 of 2' }).focus()
      await user.keyboard('{ArrowLeft}')

      expect(onReorder).toHaveBeenCalledWith(
        expect.any(Array),
        ['AD', 'MX'],
        'keyboard'
      )
      expect((onReorder.mock.calls[0][0] as Date[]).map(toDayKey)).toEqual([
        '2026-05-23',
      ])
    })

    it('does nothing when moving past either end', async () => {
      const user = userEvent.setup()
      renderPanel(range('2026-05-23', '2026-05-23'), travelDay())

      screen.getByRole('listitem', { name: 'Mexico, 1 of 2' }).focus()
      await user.keyboard('{ArrowLeft}')
      screen.getByRole('listitem', { name: 'Andorra, 2 of 2' }).focus()
      await user.keyboard('{ArrowRight}')

      expect(onReorder).not.toHaveBeenCalled()
    })

    it('still removes a country from a sortable chip', async () => {
      const user = userEvent.setup()
      renderPanel(range('2026-05-23', '2026-05-23'), travelDay())

      await user.click(
        screen.getByRole('button', { name: 'Remove Andorra from this day' })
      )

      expect(onRemove).toHaveBeenCalledWith(expect.any(Array), 'AD')
      expect(onReorder).not.toHaveBeenCalled()
    })

    it('is not offered for ranges or single-country days', () => {
      const { unmount } = renderPanel(range('2026-05-22', '2026-05-23'), [
        ...travelDay(),
        visit('MX', 4, 22),
      ])
      expect(screen.queryByRole('listitem', { name: /1 of 2/ })).toBeNull()
      unmount()

      renderPanel(range('2026-05-23', '2026-05-23'), [visit('MX', 4, 23)])
      expect(screen.queryByRole('listitem', { name: /1 of 1/ })).toBeNull()
    })
  })

  it('clears every country from the selected days', async () => {
    const user = userEvent.setup()
    renderPanel(range('2026-03-05', '2026-03-07'), [
      visit('FR', 2, 5),
      visit('IT', 2, 7),
    ])

    await user.click(screen.getByRole('button', { name: /clear all/i }))

    expect(onRemove).toHaveBeenCalledWith(expect.any(Array))
    expect(onRemove.mock.calls[0]).toHaveLength(1)
  })

  it('disables a suggestion that is already on every selected day', () => {
    renderPanel(range('2026-03-05', '2026-03-05'), [visit('FR', 2, 5)])

    expect(screen.getByRole('button', { name: 'Add France' })).toBeDisabled()
  })

  it('explains when every selected day already has two countries', () => {
    renderPanel(range('2026-03-05', '2026-03-05'), [
      visit('FR', 2, 5),
      visit('IT', 2, 5),
    ])

    expect(
      screen.getByText(/This day already has two countries/)
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /^Add / })
    ).not.toBeInTheDocument()
  })

  it('searches all countries', async () => {
    const user = userEvent.setup()
    renderPanel(range('2026-03-05', '2026-03-06'))

    await user.click(screen.getByRole('button', { name: /other country/i }))
    await user.type(screen.getByPlaceholderText('Search countries...'), 'Japan')
    await user.click(screen.getByRole('option', { name: /japan/i }))

    expect(onAdd).toHaveBeenCalledWith('JP', expect.any(Array), {
      suggested: false,
      emptyOnly: false,
    })
  })

  it('dismisses the keyboard instead of scrolling when dragging the country list', async () => {
    const user = userEvent.setup()
    renderPanel(range('2026-03-05', '2026-03-06'))

    await user.click(screen.getByRole('button', { name: /other country/i }))
    const input = screen.getByPlaceholderText('Search countries...')
    const list = screen.getByRole('listbox')
    expect(input).toHaveFocus()

    const touchAt = (clientY: number) => {
      const touch = { clientX: 100, clientY }
      return { touches: [touch], changedTouches: [touch] }
    }
    fireEvent.touchStart(list, touchAt(300))
    const drag = fireEvent.touchMove(list, touchAt(250))

    expect(drag).toBe(false)
    expect(input).not.toHaveFocus()
  })

  it('closes from the close button and with Escape', async () => {
    const user = userEvent.setup()
    renderPanel(range('2026-03-05', '2026-03-06'))

    await user.click(screen.getByRole('button', { name: 'Clear selection' }))
    await user.keyboard('{Escape}')

    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('lets Escape close the country search without clearing the selection', async () => {
    const user = userEvent.setup()
    renderPanel(range('2026-03-05', '2026-03-06'))

    await user.click(screen.getByRole('button', { name: /other country/i }))
    await user.keyboard('{Escape}')

    expect(
      screen.queryByPlaceholderText('Search countries...')
    ).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})
