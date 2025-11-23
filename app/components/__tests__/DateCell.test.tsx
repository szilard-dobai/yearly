import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DateCell from '../DateCell'
import type { CountryVisit } from '../../lib/types'

describe('DateCell', () => {
  const mockOnRemoveVisit = vi.fn()

  beforeEach(() => {
    mockOnRemoveVisit.mockClear()
  })

  describe('Empty date cell', () => {
    it('should render empty cell when date is null', () => {
      const { container } = render(
        <DateCell
          date={null}
          visits={[]}
          onRemoveVisit={mockOnRemoveVisit}
          flagDisplayMode="emoji"
        />
      )

      const cell = container.querySelector('[role="gridcell"]')
      expect(cell).toBeInTheDocument()
      expect(cell).toHaveAttribute('aria-hidden', 'true')
    })

    it('should render date number when no visits', () => {
      const date = new Date(2025, 1, 15) // Feb 15, 2025
      render(
        <DateCell
          date={date}
          visits={[]}
          onRemoveVisit={mockOnRemoveVisit}
          flagDisplayMode="emoji"
        />
      )

      expect(screen.getByText('15')).toBeInTheDocument()
    })

    it('should highlight today date in red', () => {
      const today = new Date()
      render(
        <DateCell
          date={today}
          visits={[]}
          onRemoveVisit={mockOnRemoveVisit}
          flagDisplayMode="emoji"
        />
      )

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

    it('should render single flag emoji centered', () => {
      const date = new Date(2025, 1, 15)
      const { container } = render(
        <DateCell
          date={date}
          visits={singleVisit}
          onRemoveVisit={mockOnRemoveVisit}
          flagDisplayMode="emoji"
        />
      )

      // Check that flag emoji is rendered (US flag)
      const cell = container.querySelector('[role="gridcell"]')
      expect(cell).toBeInTheDocument()
      expect(cell).toHaveTextContent('🇺🇸')
    })

    it('should render single flag icon when flagDisplayMode is icon', () => {
      const date = new Date(2025, 1, 15)
      const { container } = render(
        <DateCell
          date={date}
          visits={singleVisit}
          onRemoveVisit={mockOnRemoveVisit}
          flagDisplayMode="icon"
        />
      )

      // Check that flag icon (svg) is rendered
      const flagIcon = container.querySelector('svg')
      expect(flagIcon).toBeInTheDocument()
    })

    it('should show delete button on hover and call onRemoveVisit', async () => {
      const user = userEvent.setup()
      const date = new Date(2025, 1, 15)
      render(
        <DateCell
          date={date}
          visits={singleVisit}
          onRemoveVisit={mockOnRemoveVisit}
          flagDisplayMode="emoji"
        />
      )

      const deleteButton = screen.getByRole('button', {
        name: /remove visits: united states/i,
      })
      expect(deleteButton).toBeInTheDocument()

      await user.click(deleteButton)
      expect(mockOnRemoveVisit).toHaveBeenCalledTimes(1)
      expect(mockOnRemoveVisit).toHaveBeenCalledWith('visit-1')
    })
  })

  describe('Two countries visit - vertical stacking', () => {
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

    it('should render two flag emojis with diagonal split', () => {
      const date = new Date(2025, 1, 2)
      const { container } = render(
        <DateCell
          date={date}
          visits={twoVisits}
          onRemoveVisit={mockOnRemoveVisit}
          flagDisplayMode="emoji"
        />
      )

      // Check that both flags are present
      const cell = container.querySelector('[role="gridcell"]')
      expect(cell).toBeInTheDocument()
      expect(cell?.textContent).toContain('🇱🇻') // Latvia
      expect(cell?.textContent).toContain('🇻🇦') // Vatican City

      // Check for absolutely positioned containers (diagonal split)
      const absoluteContainers = container.querySelectorAll('.absolute.inset-0')
      expect(absoluteContainers.length).toBeGreaterThanOrEqual(2)
    })

    it('should render two flag icons with diagonal split when flagDisplayMode is icon', () => {
      const date = new Date(2025, 1, 2)
      const { container } = render(
        <DateCell
          date={date}
          visits={twoVisits}
          onRemoveVisit={mockOnRemoveVisit}
          flagDisplayMode="icon"
        />
      )

      // Check for two flag icons (svgs) - should be at least 2
      const flagIcons = container.querySelectorAll('svg')
      expect(flagIcons.length).toBeGreaterThanOrEqual(2)

      // Check for absolutely positioned containers (diagonal split)
      const absoluteContainers = container.querySelectorAll('.absolute.inset-0')
      expect(absoluteContainers.length).toBeGreaterThanOrEqual(2)
    })

    it('should use appropriate font size for diagonal split flags', () => {
      const date = new Date(2025, 1, 2)
      const { container } = render(
        <DateCell
          date={date}
          visits={twoVisits}
          onRemoveVisit={mockOnRemoveVisit}
          flagDisplayMode="emoji"
        />
      )

      // Check that both flags are present
      const cell = container.querySelector('[role="gridcell"]')
      expect(cell).toBeInTheDocument()
      expect(cell?.textContent).toContain('🇱🇻')
      expect(cell?.textContent).toContain('🇻🇦')

      // Check that they're positioned absolutely for the diagonal split
      const absoluteContainers = container.querySelectorAll('.absolute.inset-0')
      expect(absoluteContainers.length).toBeGreaterThanOrEqual(2)
    })

    it('should use clip-path for clean diagonal split', () => {
      const date = new Date(2025, 1, 2)
      const { container } = render(
        <DateCell
          date={date}
          visits={twoVisits}
          onRemoveVisit={mockOnRemoveVisit}
          flagDisplayMode="emoji"
        />
      )

      // Check for absolutely positioned containers with clip-path
      const absoluteContainers = container.querySelectorAll('.absolute.inset-0')
      expect(absoluteContainers.length).toBeGreaterThanOrEqual(2)

      // Check for overflow-hidden on clip-path containers
      const overflowContainers = container.querySelectorAll('.overflow-hidden')
      expect(overflowContainers.length).toBeGreaterThanOrEqual(2)
    })

    it('should remove all visits when delete button is clicked', async () => {
      const user = userEvent.setup()
      const date = new Date(2025, 1, 2)
      render(
        <DateCell
          date={date}
          visits={twoVisits}
          onRemoveVisit={mockOnRemoveVisit}
          flagDisplayMode="emoji"
        />
      )

      const deleteButton = screen.getByRole('button', {
        name: /remove visits: latvia, vatican city/i,
      })

      await user.click(deleteButton)

      // Should call onRemoveVisit for both visits
      expect(mockOnRemoveVisit).toHaveBeenCalledTimes(2)
      expect(mockOnRemoveVisit).toHaveBeenCalledWith('visit-1')
      expect(mockOnRemoveVisit).toHaveBeenCalledWith('visit-2')
    })

    it('should have correct aria-label with both countries', () => {
      const date = new Date(2025, 1, 2)
      const { container } = render(
        <DateCell
          date={date}
          visits={twoVisits}
          onRemoveVisit={mockOnRemoveVisit}
          flagDisplayMode="emoji"
        />
      )

      const cell = container.querySelector('[role="gridcell"]')
      expect(cell).toHaveAttribute(
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

      render(
        <DateCell
          date={date}
          visits={visits}
          onRemoveVisit={mockOnRemoveVisit}
          flagDisplayMode="emoji"
        />
      )

      // Should show date number since no visits match this date
      expect(screen.getByText('15')).toBeInTheDocument()
    })

    it('should handle country without name gracefully', () => {
      const date = new Date(2025, 1, 15)
      const visits: CountryVisit[] = [
        {
          id: 'visit-1',
          countryCode: 'XX',
          date: new Date(2025, 1, 15),
        },
      ]

      const { container } = render(
        <DateCell
          date={date}
          visits={visits}
          onRemoveVisit={mockOnRemoveVisit}
          flagDisplayMode="emoji"
        />
      )

      const cell = container.querySelector('[role="gridcell"]')
      expect(cell).toBeInTheDocument()
    })
  })

  describe('Regression tests for two-country diagonal split', () => {
    it('should use diagonal split layout with clip-path', () => {
      const date = new Date(2025, 1, 2)
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

      const { container } = render(
        <DateCell
          date={date}
          visits={twoVisits}
          onRemoveVisit={mockOnRemoveVisit}
          flagDisplayMode="emoji"
        />
      )

      // Should have absolutely positioned flag containers (not simple flex layout)
      const absoluteContainers = container.querySelectorAll('.absolute.inset-0')
      expect(absoluteContainers.length).toBeGreaterThanOrEqual(2)
    })

    it('should render exactly two flags when there are two visits', () => {
      const date = new Date(2025, 1, 2)
      const twoVisits: CountryVisit[] = [
        {
          id: 'visit-1',
          countryCode: 'UG',
          date: new Date(2025, 1, 2),
        },
        {
          id: 'visit-2',
          countryCode: 'KE',
          date: new Date(2025, 1, 2),
        },
      ]

      const { container } = render(
        <DateCell
          date={date}
          visits={twoVisits}
          onRemoveVisit={mockOnRemoveVisit}
          flagDisplayMode="emoji"
        />
      )

      // Check that both flags are present
      const cell = container.querySelector('[role="gridcell"]')
      expect(cell).toBeInTheDocument()
      expect(cell?.textContent).toContain('🇺🇬') // Uganda
      expect(cell?.textContent).toContain('🇰🇪') // Kenya

      // Should have absolutely positioned containers
      const absoluteContainers = container.querySelectorAll('.absolute.inset-0')
      expect(absoluteContainers.length).toBeGreaterThanOrEqual(2)
    })

    it('should use absolute positioning for diagonal split triangles', () => {
      const date = new Date(2025, 1, 2)
      const twoVisits: CountryVisit[] = [
        {
          id: 'visit-1',
          countryCode: 'FR',
          date: new Date(2025, 1, 2),
        },
        {
          id: 'visit-2',
          countryCode: 'ES',
          date: new Date(2025, 1, 2),
        },
      ]

      const { container } = render(
        <DateCell
          date={date}
          visits={twoVisits}
          onRemoveVisit={mockOnRemoveVisit}
          flagDisplayMode="emoji"
        />
      )

      // Both flag containers should be absolutely positioned with inset-0
      const absoluteContainers = container.querySelectorAll('.absolute.inset-0')
      expect(absoluteContainers.length).toBeGreaterThanOrEqual(2)

      // Each should have overflow-hidden for clip-path
      const overflowContainers = container.querySelectorAll('.overflow-hidden')
      expect(overflowContainers.length).toBeGreaterThanOrEqual(2)
    })
  })
})
