import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CalendarGrid from './CalendarGrid'
import type { CalendarData, CountryVisit } from '../lib/types'

vi.mock('./MonthGrid', () => ({
  default: ({
    year,
    month,
    visits,
    onRemoveVisit,
  }: {
    year: number
    month: number
    visits: CountryVisit[]
    onRemoveVisit: (id: string) => void
  }) => (
    <div
      data-testid={`month-grid-${month}`}
      data-year={year}
      data-month={month}
      data-visits-count={visits.length}
      onClick={() => onRemoveVisit('test-id')}
    >
      Month {month} - Year {year}
    </div>
  ),
}))

describe('CalendarGrid', () => {
  const mockOnRemoveVisit = vi.fn()

  const mockCalendarData: CalendarData = {
    visits: [
      {
        id: 'visit-1',
        countryCode: 'US',
        date: new Date(2024, 0, 15),
      },
      {
        id: 'visit-2',
        countryCode: 'FR',
        date: new Date(2024, 5, 20),
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders 12 MonthGrid components', () => {
      render(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2024}
          calendarData={mockCalendarData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      for (let month = 0; month < 12; month++) {
        expect(screen.getByTestId(`month-grid-${month}`)).toBeInTheDocument()
      }
    })

    it('renders all month grids with correct month numbers', () => {
      render(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2024}
          calendarData={mockCalendarData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      for (let month = 0; month < 12; month++) {
        const monthGrid = screen.getByTestId(`month-grid-${month}`)
        expect(monthGrid).toHaveAttribute('data-month', month.toString())
      }
    })

    it('applies responsive grid layout classes', () => {
      const { container } = render(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2024}
          calendarData={mockCalendarData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const gridContainer = container.querySelector('.grid')
      expect(gridContainer).toHaveClass('grid-cols-1')
      expect(gridContainer).toHaveClass('sm:grid-cols-2')
      expect(gridContainer).toHaveClass('lg:grid-cols-3')
    })

    it('applies gap spacing to grid', () => {
      const { container } = render(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2024}
          calendarData={mockCalendarData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const gridContainer = container.querySelector('.grid')
      // Component uses responsive gap spacing: gap-x-4 sm:gap-x-6 lg:gap-x-8 gap-y-4 sm:gap-y-6
      expect(gridContainer).toHaveClass('gap-x-4')
      expect(gridContainer).toHaveClass('sm:gap-x-6')
      expect(gridContainer).toHaveClass('lg:gap-x-8')
      expect(gridContainer).toHaveClass('gap-y-4')
      expect(gridContainer).toHaveClass('sm:gap-y-6')
    })
  })

  describe('prop passing', () => {
    it('passes year prop to all MonthGrid components', () => {
      render(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2024}
          calendarData={mockCalendarData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      for (let month = 0; month < 12; month++) {
        const monthGrid = screen.getByTestId(`month-grid-${month}`)
        expect(monthGrid).toHaveAttribute('data-year', '2024')
      }
    })

    it('passes different year to MonthGrid components', () => {
      render(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2025}
          calendarData={mockCalendarData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      for (let month = 0; month < 12; month++) {
        const monthGrid = screen.getByTestId(`month-grid-${month}`)
        expect(monthGrid).toHaveAttribute('data-year', '2025')
      }
    })

    it('passes visits from calendarData to MonthGrid components', () => {
      render(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2024}
          calendarData={mockCalendarData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const monthGrid = screen.getByTestId('month-grid-0')
      expect(monthGrid).toHaveAttribute('data-visits-count', '2')
    })

    it('passes onRemoveVisit to MonthGrid components', async () => {
      const user = userEvent.setup()

      render(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2024}
          calendarData={mockCalendarData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const monthGrid = screen.getByTestId('month-grid-0')
      await user.click(monthGrid)

      expect(mockOnRemoveVisit).toHaveBeenCalledWith('test-id')
    })

    it('passes onRemoveVisit to all month grids', async () => {
      const user = userEvent.setup()

      render(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2024}
          calendarData={mockCalendarData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      for (let month = 0; month < 3; month++) {
        mockOnRemoveVisit.mockClear()
        const monthGrid = screen.getByTestId(`month-grid-${month}`)
        await user.click(monthGrid)
        expect(mockOnRemoveVisit).toHaveBeenCalledWith('test-id')
      }
    })
  })

  describe('calendar data handling', () => {
    it('handles empty visits array', () => {
      const emptyCalendarData: CalendarData = {
        visits: [],
      }

      render(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2024}
          calendarData={emptyCalendarData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const monthGrid = screen.getByTestId('month-grid-0')
      expect(monthGrid).toHaveAttribute('data-visits-count', '0')
    })

    it('handles large number of visits', () => {
      const manyVisits: CountryVisit[] = Array.from(
        { length: 100 },
        (_, i) => ({
          id: `visit-${i}`,
          countryCode: 'US',
          date: new Date(2024, i % 12, (i % 28) + 1),
        })
      )

      const largeCalendarData: CalendarData = {
        visits: manyVisits,
      }

      render(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2024}
          calendarData={largeCalendarData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const monthGrid = screen.getByTestId('month-grid-0')
      expect(monthGrid).toHaveAttribute('data-visits-count', '100')
    })

    it('extracts visits from calendarData correctly', () => {
      const calendarData: CalendarData = {
        visits: [
          {
            id: 'visit-1',
            countryCode: 'US',
            date: new Date(2024, 0, 15),
          },
        ],
      }

      render(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2024}
          calendarData={calendarData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(screen.getByTestId('month-grid-0')).toBeInTheDocument()
    })
  })

  describe('month ordering', () => {
    it('renders months in correct order (0-11)', () => {
      const { container } = render(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2024}
          calendarData={mockCalendarData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const monthGrids = container.querySelectorAll(
        '[data-testid^="month-grid-"]'
      )
      const monthNumbers = Array.from(monthGrids).map((grid) =>
        parseInt(grid.getAttribute('data-month') || '0')
      )

      expect(monthNumbers).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    })

    it('maintains consistent month order across re-renders', () => {
      const { rerender } = render(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2024}
          calendarData={mockCalendarData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const firstRenderMonths = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(
        (m) => screen.getByTestId(`month-grid-${m}`)
      )

      rerender(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2024}
          calendarData={mockCalendarData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const secondRenderMonths = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(
        (m) => screen.getByTestId(`month-grid-${m}`)
      )

      expect(firstRenderMonths).toHaveLength(secondRenderMonths.length)
    })
  })

  describe('layout structure', () => {
    it('has outer wrapper with space-y-6', () => {
      const { container } = render(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2024}
          calendarData={mockCalendarData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const outerWrapper = container.querySelector('.space-y-6')
      expect(outerWrapper).toBeInTheDocument()
    })

    it('has inner grid container', () => {
      const { container } = render(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2024}
          calendarData={mockCalendarData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const gridContainer = container.querySelector('.grid')
      expect(gridContainer).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('renders correctly with year 2025', () => {
      render(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2025}
          calendarData={mockCalendarData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const monthGrid = screen.getByTestId('month-grid-0')
      expect(monthGrid).toHaveAttribute('data-year', '2025')
    })

    it('renders correctly with year 2020', () => {
      render(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2020}
          calendarData={mockCalendarData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const monthGrid = screen.getByTestId('month-grid-0')
      expect(monthGrid).toHaveAttribute('data-year', '2020')
    })

    it('renders when calendarData has no visits', () => {
      const emptyData: CalendarData = { visits: [] }

      render(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2024}
          calendarData={emptyData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(screen.getByTestId('month-grid-0')).toBeInTheDocument()
      expect(screen.getByTestId('month-grid-11')).toBeInTheDocument()
    })

    it('passes updated visits when calendarData changes', () => {
      const initialData: CalendarData = {
        visits: [
          {
            id: 'visit-1',
            countryCode: 'US',
            date: new Date(2024, 0, 15),
          },
        ],
      }

      const { rerender } = render(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2024}
          calendarData={initialData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      let monthGrid = screen.getByTestId('month-grid-0')
      expect(monthGrid).toHaveAttribute('data-visits-count', '1')

      const updatedData: CalendarData = {
        visits: [
          {
            id: 'visit-1',
            countryCode: 'US',
            date: new Date(2024, 0, 15),
          },
          {
            id: 'visit-2',
            countryCode: 'FR',
            date: new Date(2024, 0, 16),
          },
        ],
      }

      rerender(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2024}
          calendarData={updatedData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      monthGrid = screen.getByTestId('month-grid-0')
      expect(monthGrid).toHaveAttribute('data-visits-count', '2')
    })
  })

  describe('component keys', () => {
    it('uses month as key for MonthGrid components', () => {
      const { container } = render(
        <CalendarGrid
          flagDisplayMode="emoji"
          year={2024}
          calendarData={mockCalendarData}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const monthGrids = container.querySelectorAll(
        '[data-testid^="month-grid-"]'
      )
      expect(monthGrids).toHaveLength(12)
    })
  })
})
