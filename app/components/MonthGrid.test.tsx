import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MonthGrid from './MonthGrid'
import type { CountryVisit } from '../lib/types'
import * as calendar from '../lib/calendar'

vi.mock('./DateCell', () => ({
  default: ({
    date,
    visits,
    onRemoveVisit,
  }: {
    date: Date | null
    visits: CountryVisit[]
    onRemoveVisit: (id: string) => void
  }) => (
    <div
      data-testid={date ? `date-cell-${date.getDate()}` : 'date-cell-null'}
      data-date={date?.toISOString()}
      onClick={() => onRemoveVisit('test-id')}
    >
      {date ? date.getDate() : 'empty'}
    </div>
  ),
}))

vi.mock('../lib/calendar', async () => {
  const actual = await vi.importActual('../lib/calendar')
  return {
    ...actual,
    getMonthData: vi.fn(),
  }
})

describe('MonthGrid', () => {
  const mockOnRemoveVisit = vi.fn()
  const mockVisits: CountryVisit[] = [
    {
      id: 'visit-1',
      countryCode: 'US',
      date: new Date(2024, 0, 15),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders month name and year', () => {
      vi.mocked(calendar.getMonthData).mockReturnValue([])

      render(
        <MonthGrid
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(screen.getByText('January 2024')).toBeInTheDocument()
    })

    it('renders correct month names for all months', () => {
      const months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ]

      months.forEach((monthName, index) => {
        vi.mocked(calendar.getMonthData).mockReturnValue([])

        const { unmount } = render(
          <MonthGrid
            year={2024}
            month={index}
            visits={[]}
            onRemoveVisit={mockOnRemoveVisit}
          />
        )

        expect(screen.getByText(`${monthName} 2024`)).toBeInTheDocument()
        unmount()
      })
    })

    it('renders day-of-week headers', () => {
      vi.mocked(calendar.getMonthData).mockReturnValue([])

      render(
        <MonthGrid
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(screen.getByText('Sun')).toBeInTheDocument()
      expect(screen.getByText('Mon')).toBeInTheDocument()
      expect(screen.getByText('Tue')).toBeInTheDocument()
      expect(screen.getByText('Wed')).toBeInTheDocument()
      expect(screen.getByText('Thu')).toBeInTheDocument()
      expect(screen.getByText('Fri')).toBeInTheDocument()
      expect(screen.getByText('Sat')).toBeInTheDocument()
    })

    it('renders correct number of weeks', () => {
      const mockWeeks = [
        [null, new Date(2024, 0, 1), new Date(2024, 0, 2), null, null, null, null],
        [new Date(2024, 0, 7), new Date(2024, 0, 8), null, null, null, null, null],
        [new Date(2024, 0, 14), new Date(2024, 0, 15), null, null, null, null, null],
      ]
      vi.mocked(calendar.getMonthData).mockReturnValue(mockWeeks)

      const { container } = render(
        <MonthGrid
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const weekRows = container.querySelectorAll('[role="row"]')
      expect(weekRows).toHaveLength(4)
    })

    it('renders DateCell components for each day', () => {
      const mockWeeks = [
        [
          null,
          new Date(2024, 0, 1),
          new Date(2024, 0, 2),
          new Date(2024, 0, 3),
          new Date(2024, 0, 4),
          new Date(2024, 0, 5),
          new Date(2024, 0, 6),
        ],
      ]
      vi.mocked(calendar.getMonthData).mockReturnValue(mockWeeks)

      render(
        <MonthGrid
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(screen.getByTestId('date-cell-null')).toBeInTheDocument()
      expect(screen.getByTestId('date-cell-1')).toBeInTheDocument()
      expect(screen.getByTestId('date-cell-2')).toBeInTheDocument()
      expect(screen.getByTestId('date-cell-3')).toBeInTheDocument()
      expect(screen.getByTestId('date-cell-4')).toBeInTheDocument()
      expect(screen.getByTestId('date-cell-5')).toBeInTheDocument()
      expect(screen.getByTestId('date-cell-6')).toBeInTheDocument()
    })
  })

  describe('prop passing', () => {
    it('passes visits prop to DateCell components', () => {
      const mockWeeks = [[new Date(2024, 0, 1)]]
      vi.mocked(calendar.getMonthData).mockReturnValue(mockWeeks)

      render(
        <MonthGrid
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(screen.getByTestId('date-cell-1')).toBeInTheDocument()
    })

    it('passes onRemoveVisit to DateCell components', async () => {
      const user = userEvent.setup()
      const mockWeeks = [[new Date(2024, 0, 1)]]
      vi.mocked(calendar.getMonthData).mockReturnValue(mockWeeks)

      render(
        <MonthGrid
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const dateCell = screen.getByTestId('date-cell-1')
      await user.click(dateCell)

      expect(mockOnRemoveVisit).toHaveBeenCalledWith('test-id')
    })

    it('calls getMonthData with correct year and month', () => {
      vi.mocked(calendar.getMonthData).mockReturnValue([])

      render(
        <MonthGrid
          year={2024}
          month={5}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(calendar.getMonthData).toHaveBeenCalledWith(2024, 5)
    })
  })

  describe('accessibility', () => {
    it('renders section with aria-labelledby', () => {
      vi.mocked(calendar.getMonthData).mockReturnValue([])

      const { container } = render(
        <MonthGrid
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const section = container.querySelector('section')
      expect(section).toHaveAttribute('aria-labelledby', 'month-2024-0')
    })

    it('month heading has correct id for aria-labelledby', () => {
      vi.mocked(calendar.getMonthData).mockReturnValue([])

      render(
        <MonthGrid
          year={2024}
          month={3}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const heading = screen.getByText('April 2024')
      expect(heading).toHaveAttribute('id', 'month-2024-3')
    })

    it('grid has role="grid"', () => {
      vi.mocked(calendar.getMonthData).mockReturnValue([])

      const { container } = render(
        <MonthGrid
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const grid = container.querySelector('[role="grid"]')
      expect(grid).toBeInTheDocument()
    })

    it('grid has aria-label with month and year', () => {
      vi.mocked(calendar.getMonthData).mockReturnValue([])

      render(
        <MonthGrid
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const grid = screen.getByRole('grid', { name: /january 2024 calendar/i })
      expect(grid).toBeInTheDocument()
    })

    it('day headers have role="columnheader"', () => {
      vi.mocked(calendar.getMonthData).mockReturnValue([])

      const { container } = render(
        <MonthGrid
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const columnHeaders = container.querySelectorAll('[role="columnheader"]')
      expect(columnHeaders).toHaveLength(7)
    })

    it('weeks have role="row"', () => {
      const mockWeeks = [
        [new Date(2024, 0, 1), null, null, null, null, null, null],
        [new Date(2024, 0, 8), null, null, null, null, null, null],
      ]
      vi.mocked(calendar.getMonthData).mockReturnValue(mockWeeks)

      const { container } = render(
        <MonthGrid
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const rows = container.querySelectorAll('[role="row"]')
      expect(rows).toHaveLength(3)
    })
  })

  describe('grid layout', () => {
    it('applies correct grid layout classes', () => {
      vi.mocked(calendar.getMonthData).mockReturnValue([])

      const { container } = render(
        <MonthGrid
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const dayHeaders = container.querySelector('.grid-cols-7')
      expect(dayHeaders).toBeInTheDocument()
    })

    it('week rows have grid layout classes', () => {
      const mockWeeks = [
        [new Date(2024, 0, 1), null, null, null, null, null, null],
      ]
      vi.mocked(calendar.getMonthData).mockReturnValue(mockWeeks)

      const { container } = render(
        <MonthGrid
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const weekRow = container.querySelectorAll('.grid-cols-7')[1]
      expect(weekRow).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('handles empty visits array', () => {
      vi.mocked(calendar.getMonthData).mockReturnValue([
        [new Date(2024, 0, 1), null, null, null, null, null, null],
      ])

      render(
        <MonthGrid
          year={2024}
          month={0}
          visits={[]}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(screen.getByText('January 2024')).toBeInTheDocument()
    })

    it('handles month with many weeks', () => {
      const mockWeeks = Array.from({ length: 6 }, (_, i) => [
        new Date(2024, 0, i * 7 + 1),
        null,
        null,
        null,
        null,
        null,
        null,
      ])
      vi.mocked(calendar.getMonthData).mockReturnValue(mockWeeks)

      const { container } = render(
        <MonthGrid
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const rows = container.querySelectorAll('[role="row"]')
      expect(rows).toHaveLength(7)
    })

    it('handles different years', () => {
      vi.mocked(calendar.getMonthData).mockReturnValue([])

      render(
        <MonthGrid
          year={2025}
          month={11}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(screen.getByText('December 2025')).toBeInTheDocument()
    })

    it('handles month with all null dates in first week', () => {
      const mockWeeks = [
        [null, null, null, null, null, null, null],
        [new Date(2024, 0, 1), null, null, null, null, null, null],
      ]
      vi.mocked(calendar.getMonthData).mockReturnValue(mockWeeks)

      render(
        <MonthGrid
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const nullCells = screen.getAllByTestId('date-cell-null')
      expect(nullCells).toHaveLength(7)
    })
  })
})
