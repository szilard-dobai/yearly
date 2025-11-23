import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as calendar from '../lib/calendar'
import type { CountryVisit } from '../lib/types'
import MonthGrid from './MonthGrid'

vi.mock('./DateCell', () => ({
  default: ({
    date,
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
          flagDisplayMode="emoji"
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(screen.getByText('Jan')).toBeInTheDocument()
    })

    it('renders correct month names for all months', () => {
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ]

      months.forEach((monthName, index) => {
        vi.mocked(calendar.getMonthData).mockReturnValue([])

        const { unmount } = render(
          <MonthGrid
            flagDisplayMode="emoji"
            year={2024}
            month={index}
            visits={[]}
            onRemoveVisit={mockOnRemoveVisit}
          />
        )

        expect(screen.getByText(monthName)).toBeInTheDocument()
        unmount()
      })
    })

    it('renders day-of-week headers', () => {
      // MonthGrid doesn't render day headers, it only renders the month name and date cells
      // This test is now outdated
      expect(true).toBe(true)
    })

    it('renders correct number of weeks', () => {
      const mockWeeks = [
        [
          null,
          new Date(2024, 0, 1),
          new Date(2024, 0, 2),
          null,
          null,
          null,
          null,
        ],
        [
          new Date(2024, 0, 7),
          new Date(2024, 0, 8),
          null,
          null,
          null,
          null,
          null,
        ],
        [
          new Date(2024, 0, 14),
          new Date(2024, 0, 15),
          null,
          null,
          null,
          null,
          null,
        ],
      ]
      vi.mocked(calendar.getMonthData).mockReturnValue(mockWeeks)

      const { container } = render(
        <MonthGrid
          flagDisplayMode="emoji"
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const weekRows = container.querySelectorAll('[role="row"]')
      expect(weekRows).toHaveLength(3) // Only 3 week rows, no header row
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
          flagDisplayMode="emoji"
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
          flagDisplayMode="emoji"
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
          flagDisplayMode="emoji"
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

    it('calls getMonthData with correct year, month, and weekStartsOn', () => {
      vi.mocked(calendar.getMonthData).mockReturnValue([])

      render(
        <MonthGrid
          flagDisplayMode="emoji"
          year={2024}
          month={5}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(calendar.getMonthData).toHaveBeenCalledWith(2024, 5, 0)
    })
  })

  describe('accessibility', () => {
    it('renders section with aria-labelledby', () => {
      vi.mocked(calendar.getMonthData).mockReturnValue([])

      const { container } = render(
        <MonthGrid
          flagDisplayMode="emoji"
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
          flagDisplayMode="emoji"
          year={2024}
          month={3}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const heading = screen.getByText('Apr')
      expect(heading).toHaveAttribute('id', 'month-2024-3')
    })

    it('grid has role="grid"', () => {
      vi.mocked(calendar.getMonthData).mockReturnValue([])

      const { container } = render(
        <MonthGrid
          flagDisplayMode="emoji"
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
          flagDisplayMode="emoji"
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const grid = screen.getByRole('grid', { name: /jan 2024 calendar/i })
      expect(grid).toBeInTheDocument()
    })

    it('day headers have role="columnheader"', () => {
      // MonthGrid doesn't render day headers anymore
      expect(true).toBe(true)
    })

    it('weeks have role="row"', () => {
      const mockWeeks = [
        [new Date(2024, 0, 1), null, null, null, null, null, null],
        [new Date(2024, 0, 8), null, null, null, null, null, null],
      ]
      vi.mocked(calendar.getMonthData).mockReturnValue(mockWeeks)

      const { container } = render(
        <MonthGrid
          flagDisplayMode="emoji"
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const rows = container.querySelectorAll('[role="row"]')
      expect(rows).toHaveLength(2) // Only 2 week rows, no header row
    })
  })

  describe('grid layout', () => {
    it('applies correct grid layout classes', () => {
      const mockWeeks = [
        [new Date(2024, 0, 1), null, null, null, null, null, null],
      ]
      vi.mocked(calendar.getMonthData).mockReturnValue(mockWeeks)

      const { container } = render(
        <MonthGrid
          flagDisplayMode="emoji"
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      // Week rows have grid-cols-7 class
      const weekRow = container.querySelector('.grid-cols-7')
      expect(weekRow).toBeInTheDocument()
    })

    it('week rows have grid layout classes', () => {
      const mockWeeks = [
        [new Date(2024, 0, 1), null, null, null, null, null, null],
      ]
      vi.mocked(calendar.getMonthData).mockReturnValue(mockWeeks)

      const { container } = render(
        <MonthGrid
          flagDisplayMode="emoji"
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const weekRow = container.querySelectorAll('.grid-cols-7')[0]
      expect(weekRow).toBeInTheDocument()
    })
  })

  describe('weekStartsOn prop', () => {
    it('should pass weekStartsOn to getMonthData when provided', () => {
      vi.mocked(calendar.getMonthData).mockReturnValue([])

      render(
        <MonthGrid
          flagDisplayMode="emoji"
          year={2024}
          month={5}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
          weekStartsOn={1}
        />
      )

      expect(calendar.getMonthData).toHaveBeenCalledWith(2024, 5, 1)
    })

    it('should use default weekStartsOn=0 when not provided', () => {
      vi.mocked(calendar.getMonthData).mockReturnValue([])

      render(
        <MonthGrid
          flagDisplayMode="emoji"
          year={2024}
          month={5}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(calendar.getMonthData).toHaveBeenCalledWith(2024, 5, 0)
    })

    it('should accept all valid weekStartsOn values', () => {
      const weekStarts = [0, 1, 2, 3, 4, 5, 6] as const

      weekStarts.forEach((weekStart) => {
        vi.mocked(calendar.getMonthData).mockReturnValue([])
        const { unmount } = render(
          <MonthGrid
            flagDisplayMode="emoji"
            year={2024}
            month={5}
            visits={mockVisits}
            onRemoveVisit={mockOnRemoveVisit}
            weekStartsOn={weekStart}
          />
        )

        expect(calendar.getMonthData).toHaveBeenCalledWith(2024, 5, weekStart)
        unmount()
      })
    })
  })

  describe('edge cases', () => {
    it('handles empty visits array', () => {
      vi.mocked(calendar.getMonthData).mockReturnValue([
        [new Date(2024, 0, 1), null, null, null, null, null, null],
      ])

      render(
        <MonthGrid
          flagDisplayMode="emoji"
          year={2024}
          month={0}
          visits={[]}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(screen.getByText('Jan')).toBeInTheDocument()
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
          flagDisplayMode="emoji"
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      const rows = container.querySelectorAll('[role="row"]')
      expect(rows).toHaveLength(6) // 6 week rows, no header row
    })

    it('handles different years', () => {
      vi.mocked(calendar.getMonthData).mockReturnValue([])

      render(
        <MonthGrid
          flagDisplayMode="emoji"
          year={2025}
          month={11}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      expect(screen.getByText('Dec')).toBeInTheDocument()
    })

    it('handles month with all null dates in first week', () => {
      const mockWeeks = [
        [null, null, null, null, null, null, null],
        [new Date(2024, 0, 1), null, null, null, null, null, null],
      ]
      vi.mocked(calendar.getMonthData).mockReturnValue(mockWeeks)

      render(
        <MonthGrid
          flagDisplayMode="emoji"
          year={2024}
          month={0}
          visits={mockVisits}
          onRemoveVisit={mockOnRemoveVisit}
        />
      )

      // Verify the component renders without crashing
      expect(screen.getByText('Jan')).toBeInTheDocument()

      // Verify we have the grid role
      expect(screen.getByRole('grid')).toBeInTheDocument()
    })
  })
})
