import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DateCell from './DateCell'
import type { CountryVisit } from '../lib/types'
import * as calendar from '../lib/calendar'
import * as countries from '../lib/countries'

vi.mock('../lib/calendar', async () => {
  const actual = await vi.importActual('../lib/calendar')
  return {
    ...actual,
    getVisitsForDate: vi.fn(),
    isToday: vi.fn(),
  }
})

vi.mock('../lib/countries', async () => {
  const actual = await vi.importActual('../lib/countries')
  return {
    ...actual,
    getCountryByCode: vi.fn(),
  }
})

describe('DateCell', () => {
  const mockOnRemoveVisit = vi.fn()
  const mockDate = new Date(2024, 0, 15)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(calendar.isToday).mockReturnValue(false)
  })

  describe('when date is null', () => {
    it('renders empty cell with aria-hidden', () => {
      vi.mocked(calendar.getVisitsForDate).mockReturnValue([])

      const { container } = render(
        <DateCell date={null} visits={[]} onRemoveVisit={mockOnRemoveVisit} />
      )

      const cell = container.querySelector('[role="gridcell"]')
      expect(cell).toBeInTheDocument()
      expect(cell).toHaveAttribute('aria-hidden', 'true')
      expect(cell).toHaveClass('aspect-square')
    })
  })

  describe('when date has no visits', () => {
    it('renders empty cell with date number', () => {
      vi.mocked(calendar.getVisitsForDate).mockReturnValue([])

      render(
        <DateCell
          date={mockDate}
          visits={[]}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(screen.getByText('15')).toBeInTheDocument()
      expect(
        screen.getByRole('gridcell', {
          name: /january 15, no visits/i,
        })
      ).toBeInTheDocument()
    })

    it('applies correct base classes', () => {
      vi.mocked(calendar.getVisitsForDate).mockReturnValue([])

      const { container } = render(
        <DateCell
          date={mockDate}
          visits={[]}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const cell = container.querySelector('[role="gridcell"]')
      expect(cell).toHaveClass('aspect-square')
      expect(cell).toHaveClass('border')
      expect(cell).toHaveClass('rounded-lg')
    })
  })

  describe('when date is today', () => {
    it('applies today ring styling', () => {
      vi.mocked(calendar.isToday).mockReturnValue(true)
      vi.mocked(calendar.getVisitsForDate).mockReturnValue([])

      const { container } = render(
        <DateCell
          date={mockDate}
          visits={[]}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const cell = container.querySelector('[role="gridcell"]')
      expect(cell).toHaveClass('ring-2')
      expect(cell).toHaveClass('ring-blue-500')
    })
  })

  describe('when date has one visit', () => {
    const mockVisit: CountryVisit = {
      id: 'visit-1',
      countryCode: 'US',
      date: mockDate,
    }

    it('renders single flag', () => {
      vi.mocked(calendar.getVisitsForDate).mockReturnValue([mockVisit])
      vi.mocked(countries.getCountryByCode).mockReturnValue({
        code: 'US',
        name: 'United States',
      })

      render(
        <DateCell
          date={mockDate}
          visits={[mockVisit]}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(
        screen.getByRole('gridcell', {
          name: /january 15, visited united states/i,
        })
      ).toBeInTheDocument()
    })

    it('renders delete button that appears on hover', () => {
      vi.mocked(calendar.getVisitsForDate).mockReturnValue([mockVisit])
      vi.mocked(countries.getCountryByCode).mockReturnValue({
        code: 'US',
        name: 'United States',
      })

      render(
        <DateCell
          date={mockDate}
          visits={[mockVisit]}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const deleteButton = screen.getByRole('button', {
        name: /remove united states visit/i,
      })
      expect(deleteButton).toBeInTheDocument()
      expect(deleteButton).toHaveClass('opacity-0')
      expect(deleteButton).toHaveClass('group-hover:opacity-100')
    })

    it('calls onRemoveVisit when delete button clicked', async () => {
      const user = userEvent.setup()
      vi.mocked(calendar.getVisitsForDate).mockReturnValue([mockVisit])
      vi.mocked(countries.getCountryByCode).mockReturnValue({
        code: 'US',
        name: 'United States',
      })

      render(
        <DateCell
          date={mockDate}
          visits={[mockVisit]}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const deleteButton = screen.getByRole('button', {
        name: /remove united states visit/i,
      })
      await user.click(deleteButton)

      expect(mockOnRemoveVisit).toHaveBeenCalledWith('visit-1')
      expect(mockOnRemoveVisit).toHaveBeenCalledTimes(1)
    })

    it('renders screen reader text with country name and day', () => {
      vi.mocked(calendar.getVisitsForDate).mockReturnValue([mockVisit])
      vi.mocked(countries.getCountryByCode).mockReturnValue({
        code: 'US',
        name: 'United States',
      })

      render(
        <DateCell
          date={mockDate}
          visits={[mockVisit]}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(screen.getByText(/united states on 15/i)).toBeInTheDocument()
      expect(screen.getByText(/united states on 15/i)).toHaveClass('sr-only')
    })

    it('uses country code when country not found', () => {
      vi.mocked(calendar.getVisitsForDate).mockReturnValue([mockVisit])
      vi.mocked(countries.getCountryByCode).mockReturnValue(undefined)

      render(
        <DateCell
          date={mockDate}
          visits={[mockVisit]}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(
        screen.getByRole('gridcell', {
          name: /january 15, visited us/i,
        })
      ).toBeInTheDocument()
    })
  })

  describe('when date has two visits', () => {
    const mockVisit1: CountryVisit = {
      id: 'visit-1',
      countryCode: 'US',
      date: mockDate,
    }

    const mockVisit2: CountryVisit = {
      id: 'visit-2',
      countryCode: 'FR',
      date: mockDate,
    }

    it('renders two stacked flags', () => {
      vi.mocked(calendar.getVisitsForDate).mockReturnValue([
        mockVisit1,
        mockVisit2,
      ])
      vi.mocked(countries.getCountryByCode).mockImplementation((code) => {
        if (code === 'US') return { code: 'US', name: 'United States' }
        if (code === 'FR') return { code: 'FR', name: 'France' }
        return undefined
      })

      render(
        <DateCell
          date={mockDate}
          visits={[mockVisit1, mockVisit2]}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      // Both countries are rendered (verified by aria-label)
      expect(
        screen.getByRole('gridcell', {
          name: /january 15, visited united states and france/i,
        })
      ).toBeInTheDocument()
    })

    it('renders aria-label with both country names', () => {
      vi.mocked(calendar.getVisitsForDate).mockReturnValue([
        mockVisit1,
        mockVisit2,
      ])
      vi.mocked(countries.getCountryByCode).mockImplementation((code) => {
        if (code === 'US') return { code: 'US', name: 'United States' }
        if (code === 'FR') return { code: 'FR', name: 'France' }
        return undefined
      })

      render(
        <DateCell
          date={mockDate}
          visits={[mockVisit1, mockVisit2]}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(
        screen.getByRole('gridcell', {
          name: /january 15, visited united states and france/i,
        })
      ).toBeInTheDocument()
    })

    it('renders two separate delete buttons', () => {
      vi.mocked(calendar.getVisitsForDate).mockReturnValue([
        mockVisit1,
        mockVisit2,
      ])
      vi.mocked(countries.getCountryByCode).mockImplementation((code) => {
        if (code === 'US') return { code: 'US', name: 'United States' }
        if (code === 'FR') return { code: 'FR', name: 'France' }
        return undefined
      })

      render(
        <DateCell
          date={mockDate}
          visits={[mockVisit1, mockVisit2]}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const deleteButtons = screen.getAllByRole('button')
      expect(deleteButtons).toHaveLength(2)
      expect(
        screen.getByRole('button', { name: /remove united states visit/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /remove france visit/i })
      ).toBeInTheDocument()
    })

    it('calls onRemoveVisit with correct visit id for first flag', async () => {
      const user = userEvent.setup()
      vi.mocked(calendar.getVisitsForDate).mockReturnValue([
        mockVisit1,
        mockVisit2,
      ])
      vi.mocked(countries.getCountryByCode).mockImplementation((code) => {
        if (code === 'US') return { code: 'US', name: 'United States' }
        if (code === 'FR') return { code: 'FR', name: 'France' }
        return undefined
      })

      render(
        <DateCell
          date={mockDate}
          visits={[mockVisit1, mockVisit2]}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const deleteButton = screen.getByRole('button', {
        name: /remove united states visit/i,
      })
      await user.click(deleteButton)

      expect(mockOnRemoveVisit).toHaveBeenCalledWith('visit-1')
    })

    it('calls onRemoveVisit with correct visit id for second flag', async () => {
      const user = userEvent.setup()
      vi.mocked(calendar.getVisitsForDate).mockReturnValue([
        mockVisit1,
        mockVisit2,
      ])
      vi.mocked(countries.getCountryByCode).mockImplementation((code) => {
        if (code === 'US') return { code: 'US', name: 'United States' }
        if (code === 'FR') return { code: 'FR', name: 'France' }
        return undefined
      })

      render(
        <DateCell
          date={mockDate}
          visits={[mockVisit1, mockVisit2]}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const deleteButton = screen.getByRole('button', {
        name: /remove france visit/i,
      })
      await user.click(deleteButton)

      expect(mockOnRemoveVisit).toHaveBeenCalledWith('visit-2')
    })

    it('renders screen reader text with both country names', () => {
      vi.mocked(calendar.getVisitsForDate).mockReturnValue([
        mockVisit1,
        mockVisit2,
      ])
      vi.mocked(countries.getCountryByCode).mockImplementation((code) => {
        if (code === 'US') return { code: 'US', name: 'United States' }
        if (code === 'FR') return { code: 'FR', name: 'France' }
        return undefined
      })

      render(
        <DateCell
          date={mockDate}
          visits={[mockVisit1, mockVisit2]}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(
        screen.getByText(/united states and france on 15/i)
      ).toBeInTheDocument()
      expect(screen.getByText(/united states and france on 15/i)).toHaveClass(
        'sr-only'
      )
    })
  })

  describe('FlagPlaceholder', () => {
    const mockVisit: CountryVisit = {
      id: 'visit-1',
      countryCode: 'XX',
      date: mockDate,
    }

    it('renders country code fallback when country not found', () => {
      vi.mocked(calendar.getVisitsForDate).mockReturnValue([mockVisit])
      vi.mocked(countries.getCountryByCode).mockReturnValue(undefined)

      const { container } = render(
        <DateCell
          date={mockDate}
          visits={[mockVisit]}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(container.textContent).toContain('XX')
    })

    it('renders country code fallback when flag import fails', () => {
      vi.mocked(calendar.getVisitsForDate).mockReturnValue([mockVisit])
      vi.mocked(countries.getCountryByCode).mockReturnValue({
        code: 'XX',
        name: 'Unknown Country',
      })

      const { container } = render(
        <DateCell
          date={mockDate}
          visits={[mockVisit]}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(container.textContent).toContain('XX')
    })
  })

  describe('accessibility', () => {
    it('has proper role for empty cell', () => {
      vi.mocked(calendar.getVisitsForDate).mockReturnValue([])

      render(
        <DateCell
          date={mockDate}
          visits={[]}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(screen.getByRole('gridcell')).toBeInTheDocument()
    })

    it('has proper aria-label for empty cell', () => {
      vi.mocked(calendar.getVisitsForDate).mockReturnValue([])

      render(
        <DateCell
          date={mockDate}
          visits={[]}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(
        screen.getByRole('gridcell', { name: /january 15, no visits/i })
      ).toBeInTheDocument()
    })

    it('has proper aria-label with country visit', () => {
      const mockVisit: CountryVisit = {
        id: 'visit-1',
        countryCode: 'US',
        date: mockDate,
      }
      vi.mocked(calendar.getVisitsForDate).mockReturnValue([mockVisit])
      vi.mocked(countries.getCountryByCode).mockReturnValue({
        code: 'US',
        name: 'United States',
      })

      render(
        <DateCell
          date={mockDate}
          visits={[mockVisit]}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(
        screen.getByRole('gridcell', {
          name: /january 15, visited united states/i,
        })
      ).toBeInTheDocument()
    })

    it('delete button has descriptive aria-label', () => {
      const mockVisit: CountryVisit = {
        id: 'visit-1',
        countryCode: 'US',
        date: mockDate,
      }
      vi.mocked(calendar.getVisitsForDate).mockReturnValue([mockVisit])
      vi.mocked(countries.getCountryByCode).mockReturnValue({
        code: 'US',
        name: 'United States',
      })

      render(
        <DateCell
          date={mockDate}
          visits={[mockVisit]}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(
        screen.getByRole('button', { name: /remove united states visit/i })
      ).toBeInTheDocument()
    })
  })
})
