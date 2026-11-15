import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithSettings } from '@/test/test-utils'
import DateCell from './DateCell'
import type { CountryVisit } from '@/lib/types'

function flagImages(container: HTMLElement) {
  return [...container.querySelectorAll<HTMLImageElement>('[data-day] img')]
}

function flagCodes(container: HTMLElement) {
  return flagImages(container).map(
    (image) =>
      image.getAttribute('src')?.match(/\/([a-z]{2})\.[0-9a-f]+\.webp$/)?.[1]
  )
}

describe('DateCell', () => {
  describe('Empty date cell', () => {
    it('should render empty cell when date is null', () => {
      const { container } = renderWithSettings(
        <DateCell date={null} visits={[]} />
      )

      const cell = container.querySelector('[role="gridcell"]')
      expect(cell).toBeInTheDocument()
      expect(cell).toHaveAttribute('aria-hidden', 'true')
    })

    it('should render date number when no visits', () => {
      const date = new Date(2025, 1, 15) // Feb 15, 2025
      renderWithSettings(<DateCell date={date} visits={[]} />)

      expect(screen.getByText('15')).toBeInTheDocument()
    })

    it('should highlight today date in red', () => {
      const today = new Date()
      renderWithSettings(<DateCell date={today} visits={[]} />)

      const dayNumber = screen.getByText(today.getDate().toString())
      expect(dayNumber).toHaveClass('text-red-500')
      expect(dayNumber).toHaveClass('font-bold')
    })
  })

  describe('Single country visit', () => {
    const singleVisit: CountryVisit[] = [
      {
        id: 'visit-1',
        countryCode: 'US',
        date: new Date(2025, 1, 15),
      },
    ]

    it('shows the flag image in place of the day number', () => {
      const { container } = renderWithSettings(
        <DateCell date={new Date(2025, 1, 15)} visits={singleVisit} />
      )

      expect(flagCodes(container)).toEqual(['us'])
      expect(screen.queryByText('15')).not.toBeInTheDocument()
    })

    it('leaves the flag out of the accessible name, which the button already gives', () => {
      const { container } = renderWithSettings(
        <DateCell date={new Date(2025, 1, 15)} visits={singleVisit} />
      )

      expect(flagImages(container)[0]).toHaveAttribute('alt', '')
      expect(
        screen.getByRole('button', {
          name: 'February 15, visited United States',
        })
      ).toBeInTheDocument()
    })

    it('does not render a remove button that a tap could trigger by accident', () => {
      renderWithSettings(
        <DateCell date={new Date(2025, 1, 15)} visits={singleVisit} />
      )

      expect(
        screen.queryByRole('button', { name: /remove/i })
      ).not.toBeInTheDocument()
    })
  })

  describe('Selection', () => {
    it('renders the day as a button keyed by its date', () => {
      renderWithSettings(<DateCell date={new Date(2025, 1, 5)} visits={[]} />)

      const button = screen.getByRole('button', {
        name: 'February 5, no visits',
      })
      expect(button).toHaveAttribute('data-day', '2025-02-05')
    })

    it('is not marked as selected by default', () => {
      const { container } = renderWithSettings(
        <DateCell date={new Date(2025, 1, 5)} visits={[]} />
      )

      const cell = container.querySelector('[role="gridcell"]')
      expect(cell).toHaveAttribute('aria-selected', 'false')
      expect(cell).not.toHaveAttribute('data-selected')
      expect(screen.getByRole('button')).not.toHaveAttribute('data-edge')
    })

    it('marks selected cells and their rounded ends', () => {
      const { container } = renderWithSettings(
        <DateCell
          date={new Date(2025, 1, 5)}
          visits={[]}
          selected
          selectionEdge
          roundStart
        />
      )

      const cell = container.querySelector('[role="gridcell"]')
      expect(cell).toHaveAttribute('aria-selected', 'true')
      expect(cell).toHaveAttribute('data-selected')
      expect(cell).toHaveAttribute('data-round-start')
      expect(cell).not.toHaveAttribute('data-round-end')
      expect(screen.getByRole('button')).toHaveAttribute('data-edge')
    })

    it('ignores rounding flags when the cell is not selected', () => {
      const { container } = renderWithSettings(
        <DateCell date={new Date(2025, 1, 5)} visits={[]} roundStart roundEnd />
      )

      const cell = container.querySelector('[role="gridcell"]')
      expect(cell).not.toHaveAttribute('data-round-start')
      expect(cell).not.toHaveAttribute('data-round-end')
    })
  })

  describe('Two countries on one day', () => {
    const twoVisits: CountryVisit[] = [
      {
        id: 'visit-1',
        countryCode: 'LV',
        date: new Date(2025, 1, 2),
      },
      {
        id: 'visit-2',
        countryCode: 'VA',
        date: new Date(2025, 1, 2),
      },
    ]

    it('splits the two flags diagonally, in the order they were added', () => {
      const { container } = renderWithSettings(
        <DateCell date={new Date(2025, 1, 2)} visits={twoVisits} />
      )

      const [first, second] = flagImages(container)
      expect(flagCodes(container)).toEqual(['lv', 'va'])
      expect(first.style.clipPath).toBe('polygon(0 0, 100% 0, 0 100%)')
      expect(second.style.clipPath).toBe('polygon(100% 0, 100% 100%, 0 100%)')
      expect(first.style.position).toBe('absolute')
      expect(second.style.position).toBe('absolute')
    })

    it('names both countries in the button label', () => {
      const { container } = renderWithSettings(
        <DateCell date={new Date(2025, 1, 2)} visits={twoVisits} />
      )

      expect(container.querySelector('[data-day]')).toHaveAttribute(
        'aria-label',
        'February 2, visited Latvia, Vatican City'
      )
    })
  })

  describe('Edge cases', () => {
    it('should handle visits for different dates gracefully', () => {
      const date = new Date(2025, 1, 15)
      const visits: CountryVisit[] = [
        {
          id: 'visit-1',
          countryCode: 'US',
          date: new Date(2025, 1, 10), // Different date
        },
      ]

      renderWithSettings(<DateCell date={date} visits={visits} />)

      // Should show date number since no visits match this date
      expect(screen.getByText('15')).toBeInTheDocument()
    })

    it('shows the code for a country without a flag image', () => {
      const date = new Date(2025, 1, 15)
      const visits: CountryVisit[] = [
        {
          id: 'visit-1',
          countryCode: 'XX',
          date: new Date(2025, 1, 15),
        },
      ]

      const { container } = renderWithSettings(
        <DateCell date={date} visits={visits} />
      )

      expect(container.querySelector('[data-day] img')).toBeNull()
      expect(screen.getByText('XX')).toBeInTheDocument()
    })
  })
})
