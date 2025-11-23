import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { DateRange } from 'react-day-picker'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as calendar from '../lib/calendar'
import * as countries from '../lib/countries'
import type { CalendarData, Country } from '../lib/types'
import * as utils from '../lib/utils'
import CountryInput from './CountryInput'

vi.mock('../lib/countries', async () => {
  const actual = await vi.importActual('../lib/countries')
  return {
    ...actual,
    searchCountries: vi.fn(),
  }
})

vi.mock('../lib/calendar', async () => {
  const actual = await vi.importActual('../lib/calendar')
  return {
    ...actual,
    expandDateRange: vi.fn(),
    canAddVisitToDate: vi.fn(),
  }
})

vi.mock('../lib/utils', async () => {
  const actual = await vi.importActual('../lib/utils')
  return {
    ...actual,
    generateId: vi.fn(),
  }
})

vi.mock('@/app/components/ui/calendar', () => ({
  Calendar: ({
    mode,
    onSelect,
  }: {
    mode: string
    selected: DateRange
    onSelect: (range: DateRange) => void
  }) => (
    <div data-testid="mock-calendar">
      <button
        type="button"
        onClick={() =>
          onSelect({
            from: new Date(2024, 0, 15),
            to: mode === 'range' ? new Date(2024, 0, 20) : undefined,
          })
        }
      >
        Select Date
      </button>
    </div>
  ),
}))

vi.mock('@/app/components/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-popover">{children}</div>
  ),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}))

describe('CountryInput', () => {
  const mockOnDataChange = vi.fn()
  const mockCalendarData: CalendarData = {
    visits: [],
  }
  const year = new Date().getFullYear()

  const mockCountries: Country[] = [
    { code: 'US', name: 'United States' },
    { code: 'FR', name: 'France' },
    { code: 'DE', name: 'Germany' },
    { code: 'GB', name: 'United Kingdom' },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(countries.searchCountries).mockReturnValue([])
    vi.mocked(calendar.expandDateRange).mockReturnValue([])
    vi.mocked(calendar.canAddVisitToDate).mockReturnValue(true)
    vi.mocked(utils.generateId).mockReturnValue('test-id-123')
  })

  describe('form rendering', () => {
    it('renders country search input', () => {
      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      expect(
        screen.getByLabelText(/country/i, { selector: 'input' })
      ).toBeInTheDocument()
      expect(
        screen.getByPlaceholderText(/search countries/i)
      ).toBeInTheDocument()
    })

    it('renders date range picker', () => {
      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      expect(screen.getByText('Date Range')).toBeInTheDocument()
      expect(screen.getByText(/pick a date/i)).toBeInTheDocument()
    })

    it('renders calendar popover trigger button', () => {
      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      expect(
        screen.getByRole('button', { name: /pick a date/i })
      ).toBeInTheDocument()
    })

    it('renders submit button', () => {
      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      expect(
        screen.getByRole('button', { name: /add visit/i })
      ).toBeInTheDocument()
    })

    it('submit button is disabled by default', () => {
      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      expect(screen.getByRole('button', { name: /add visit/i })).toBeDisabled()
    })
  })

  describe('country search', () => {
    it('filters countries when typing', async () => {
      const user = userEvent.setup()
      vi.mocked(countries.searchCountries).mockReturnValue(mockCountries)

      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      const input = screen.getByLabelText(/country/i, { selector: 'input' })
      await user.type(input, 'uni')

      expect(countries.searchCountries).toHaveBeenCalledWith('uni')
    })

    it('shows autocomplete dropdown with results', async () => {
      const user = userEvent.setup()
      vi.mocked(countries.searchCountries).mockReturnValue(mockCountries)

      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      const input = screen.getByLabelText(/country/i, { selector: 'input' })
      await user.type(input, 'uni')

      await waitFor(() => {
        expect(screen.getByText('United States')).toBeInTheDocument()
        expect(screen.getByText('United Kingdom')).toBeInTheDocument()
      })
    })

    it('limits dropdown to 10 results', async () => {
      const user = userEvent.setup()
      const manyCountries = Array.from({ length: 20 }, (_, i) => ({
        code: `C${i}`,
        name: `Country ${i}`,
      }))
      vi.mocked(countries.searchCountries).mockReturnValue(manyCountries)

      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      const input = screen.getByLabelText(/country/i, { selector: 'input' })
      await user.type(input, 'country')

      await waitFor(() => {
        expect(
          screen.getAllByRole('button', { name: /country/i })
        ).toHaveLength(10)
      })
    })

    it('does not show dropdown when search is empty', async () => {
      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      expect(screen.queryByText('United States')).not.toBeInTheDocument()
    })

    it('shows dropdown when input is focused with existing value', async () => {
      const user = userEvent.setup()
      vi.mocked(countries.searchCountries).mockReturnValue(mockCountries)

      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      const input = screen.getByLabelText(/country/i, { selector: 'input' })
      await user.type(input, 'uni')
      await user.tab()
      await user.click(input)

      await waitFor(() => {
        expect(screen.getByText('United States')).toBeInTheDocument()
      })
    })
  })

  describe('country selection', () => {
    it('populates form when country is selected', async () => {
      const user = userEvent.setup()
      vi.mocked(countries.searchCountries).mockReturnValue(mockCountries)

      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      const input = screen.getByLabelText(/country/i, { selector: 'input' })
      await user.type(input, 'uni')

      const usaButton = screen.getByRole('button', { name: 'United States' })
      await user.click(usaButton)

      expect(input).toHaveValue('United States')
    })

    it('closes dropdown when country is selected', async () => {
      const user = userEvent.setup()
      vi.mocked(countries.searchCountries).mockReturnValue(mockCountries)

      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      const input = screen.getByLabelText(/country/i, { selector: 'input' })
      await user.type(input, 'uni')

      const usaButton = screen.getByRole('button', { name: 'United States' })
      await user.click(usaButton)

      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: 'France' })
        ).not.toBeInTheDocument()
      })
    })

    it('enables submit button when country and date are selected', async () => {
      const user = userEvent.setup()
      vi.mocked(countries.searchCountries).mockReturnValue(mockCountries)

      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      const countryInput = screen.getByLabelText(/country/i, {
        selector: 'input',
      })
      await user.type(countryInput, 'uni')

      const usaButton = screen.getByRole('button', { name: 'United States' })
      await user.click(usaButton)

      // Click the date picker button to open it
      const datePickerButton = screen.getByRole('button', {
        name: /pick a date/i,
      })
      await user.click(datePickerButton)

      // Select a date from the mock calendar
      const selectDateButton = screen.getByRole('button', {
        name: 'Select Date',
      })
      await user.click(selectDateButton)

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /add visit/i })
        ).not.toBeDisabled()
      })
    })

    it('clears selected country when search query changes', async () => {
      const user = userEvent.setup()
      vi.mocked(countries.searchCountries).mockReturnValue(mockCountries)

      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      const input = screen.getByLabelText(/country/i, { selector: 'input' })
      await user.type(input, 'uni')

      const usaButton = screen.getByRole('button', { name: 'United States' })
      await user.click(usaButton)

      await user.clear(input)
      await user.type(input, 'fra')

      const submitButton = screen.getByRole('button', { name: /add visit/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('form validation', () => {
    it('shows error when submitting without country', () => {
      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      const submitButton = screen.getByRole('button', { name: /add visit/i })
      expect(submitButton).toBeDisabled()
    })

    it('shows error when submitting without date', () => {
      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      const submitButton = screen.getByRole('button', { name: /add visit/i })
      expect(submitButton).toBeDisabled()
    })

    it('date picker button shows selected date range', async () => {
      const user = userEvent.setup()
      vi.mocked(countries.searchCountries).mockReturnValue(mockCountries)

      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      const countryInput = screen.getByLabelText(/country/i, {
        selector: 'input',
      })
      await user.type(countryInput, 'uni')
      const usaButton = screen.getByRole('button', { name: 'United States' })
      await user.click(usaButton)

      // Click the date picker button
      const datePickerButton = screen.getByRole('button', {
        name: /pick a date/i,
      })
      await user.click(datePickerButton)

      // Select a date
      const selectDateButton = screen.getByRole('button', {
        name: 'Select Date',
      })
      await user.click(selectDateButton)

      await waitFor(() => {
        expect(
          screen.getByText(/Jan 15, 2024 - Jan 20, 2024/i)
        ).toBeInTheDocument()
      })
    })

    it('shows error when maximum 2 countries per day exceeded', async () => {
      const user = userEvent.setup()
      vi.mocked(countries.searchCountries).mockReturnValue(mockCountries)
      vi.mocked(calendar.expandDateRange).mockReturnValue([
        new Date(2024, 0, 15),
      ])
      vi.mocked(calendar.canAddVisitToDate).mockReturnValue(false)

      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      const countryInput = screen.getByLabelText(/country/i, {
        selector: 'input',
      })
      await user.type(countryInput, 'uni')
      const usaButton = screen.getByRole('button', { name: 'United States' })
      await user.click(usaButton)

      // Open calendar and select date
      const datePickerButton = screen.getByRole('button', {
        name: /pick a date/i,
      })
      await user.click(datePickerButton)
      const selectDateButton = screen.getByRole('button', {
        name: 'Select Date',
      })
      await user.click(selectDateButton)

      const submitButton = screen.getByRole('button', { name: /add visit/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/maximum 2 countries per day exceeded/i)
        ).toBeInTheDocument()
      })
    })
  })

  describe('form submission', () => {
    it('calls onDataChange with new visit for single date', async () => {
      const user = userEvent.setup()
      vi.mocked(countries.searchCountries).mockReturnValue(mockCountries)
      const mockDate = new Date(2024, 0, 15)
      vi.mocked(calendar.expandDateRange).mockReturnValue([mockDate])
      vi.mocked(utils.generateId).mockReturnValue('visit-123')

      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      const countryInput = screen.getByLabelText(/country/i, {
        selector: 'input',
      })
      await user.type(countryInput, 'uni')
      const usaButton = screen.getByRole('button', { name: 'United States' })
      await user.click(usaButton)

      // Open calendar and select date
      const datePickerButton = screen.getByRole('button', {
        name: /pick a date/i,
      })
      await user.click(datePickerButton)
      const selectDateButton = screen.getByRole('button', {
        name: 'Select Date',
      })
      await user.click(selectDateButton)

      const submitButton = screen.getByRole('button', { name: /add visit/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnDataChange).toHaveBeenCalledWith({
          visits: [
            {
              id: 'visit-123',
              countryCode: 'US',
              date: mockDate,
            },
          ],
        })
      })
    })

    it('calls onDataChange with multiple visits for date range', async () => {
      const user = userEvent.setup()
      vi.mocked(countries.searchCountries).mockReturnValue(mockCountries)
      const mockDates = [
        new Date(2024, 0, 15),
        new Date(2024, 0, 16),
        new Date(2024, 0, 17),
      ]
      vi.mocked(calendar.expandDateRange).mockReturnValue(mockDates)
      vi.mocked(utils.generateId)
        .mockReturnValueOnce('visit-1')
        .mockReturnValueOnce('visit-2')
        .mockReturnValueOnce('visit-3')

      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      const countryInput = screen.getByLabelText(/country/i, {
        selector: 'input',
      })
      await user.type(countryInput, 'uni')
      const usaButton = screen.getByRole('button', { name: 'United States' })
      await user.click(usaButton)

      // Open calendar and select date range
      const datePickerButton = screen.getByRole('button', {
        name: /pick a date/i,
      })
      await user.click(datePickerButton)
      const selectDateButton = screen.getByRole('button', {
        name: 'Select Date',
      })
      await user.click(selectDateButton)

      const submitButton = screen.getByRole('button', { name: /add visit/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnDataChange).toHaveBeenCalledWith({
          visits: [
            { id: 'visit-1', countryCode: 'US', date: mockDates[0] },
            { id: 'visit-2', countryCode: 'US', date: mockDates[1] },
            { id: 'visit-3', countryCode: 'US', date: mockDates[2] },
          ],
        })
      })
    })

    it('preserves existing visits when adding new ones', async () => {
      const user = userEvent.setup()
      const existingVisit = {
        id: 'existing-1',
        countryCode: 'FR',
        date: new Date(2024, 0, 10),
      }
      const dataWithVisits: CalendarData = {
        visits: [existingVisit],
      }

      vi.mocked(countries.searchCountries).mockReturnValue(mockCountries)
      const mockDate = new Date(2024, 0, 15)
      vi.mocked(calendar.expandDateRange).mockReturnValue([mockDate])
      vi.mocked(utils.generateId).mockReturnValue('visit-123')

      render(
        <CountryInput
          year={year}
          calendarData={dataWithVisits}
          onDataChange={mockOnDataChange}
        />
      )

      const countryInput = screen.getByLabelText(/country/i, {
        selector: 'input',
      })
      await user.type(countryInput, 'uni')
      const usaButton = screen.getByRole('button', { name: 'United States' })
      await user.click(usaButton)

      // Open calendar and select date
      const datePickerButton = screen.getByRole('button', {
        name: /pick a date/i,
      })
      await user.click(datePickerButton)
      const selectDateButton = screen.getByRole('button', {
        name: 'Select Date',
      })
      await user.click(selectDateButton)

      const submitButton = screen.getByRole('button', { name: /add visit/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnDataChange).toHaveBeenCalledWith({
          visits: [
            existingVisit,
            {
              id: 'visit-123',
              countryCode: 'US',
              date: mockDate,
            },
          ],
        })
      })
    })

    it('resets form after successful submission', async () => {
      const user = userEvent.setup()
      vi.mocked(countries.searchCountries).mockReturnValue(mockCountries)
      vi.mocked(calendar.expandDateRange).mockReturnValue([
        new Date(2024, 0, 15),
      ])

      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      const countryInput = screen.getByLabelText(/country/i, {
        selector: 'input',
      })
      await user.type(countryInput, 'uni')
      const usaButton = screen.getByRole('button', { name: 'United States' })
      await user.click(usaButton)

      // Open calendar and select date
      const datePickerButton = screen.getByRole('button', {
        name: /pick a date/i,
      })
      await user.click(datePickerButton)
      const selectDateButton = screen.getByRole('button', {
        name: 'Select Date',
      })
      await user.click(selectDateButton)

      const submitButton = screen.getByRole('button', { name: /add visit/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(countryInput).toHaveValue('')
        expect(screen.getByText(/pick a date/i)).toBeInTheDocument()
      })
    })

    it('clears error after successful submission', async () => {
      const user = userEvent.setup()
      vi.mocked(countries.searchCountries).mockReturnValue(mockCountries)
      vi.mocked(calendar.expandDateRange)
        .mockReturnValueOnce([new Date(2024, 0, 15)])
        .mockReturnValueOnce([new Date(2024, 0, 16)])
      vi.mocked(calendar.canAddVisitToDate)
        .mockReturnValueOnce(false)
        .mockReturnValue(true)

      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      const countryInput = screen.getByLabelText(/country/i, {
        selector: 'input',
      })
      await user.type(countryInput, 'uni')
      const usaButton = screen.getByRole('button', { name: 'United States' })
      await user.click(usaButton)

      // Select first date
      let datePickerButton = screen.getByRole('button', {
        name: /pick a date/i,
      })
      await user.click(datePickerButton)
      let selectDateButton = screen.getByRole('button', { name: 'Select Date' })
      await user.click(selectDateButton)

      const submitButton = screen.getByRole('button', { name: /add visit/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.getByText(/maximum 2 countries per day exceeded/i)
        ).toBeInTheDocument()
      })

      // Select different date
      datePickerButton = screen.getByRole('button', { name: /Jan 15, 2024/i })
      await user.click(datePickerButton)
      selectDateButton = screen.getByRole('button', { name: 'Select Date' })
      await user.click(selectDateButton)
      await user.click(submitButton)

      await waitFor(() => {
        expect(
          screen.queryByText(/maximum 2 countries per day exceeded/i)
        ).not.toBeInTheDocument()
      })
    })
  })

  describe('error display', () => {
    it('displays error messages in red', async () => {
      const user = userEvent.setup()
      vi.mocked(countries.searchCountries).mockReturnValue(mockCountries)
      vi.mocked(calendar.expandDateRange).mockReturnValue([
        new Date(2024, 0, 15),
      ])
      vi.mocked(calendar.canAddVisitToDate).mockReturnValue(false)

      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      const countryInput = screen.getByLabelText(/country/i, {
        selector: 'input',
      })
      await user.type(countryInput, 'uni')
      const usaButton = screen.getByRole('button', { name: 'United States' })
      await user.click(usaButton)

      // Open calendar and select date
      const datePickerButton = screen.getByRole('button', {
        name: /pick a date/i,
      })
      await user.click(datePickerButton)
      const selectDateButton = screen.getByRole('button', {
        name: 'Select Date',
      })
      await user.click(selectDateButton)

      const submitButton = screen.getByRole('button', { name: /add visit/i })
      await user.click(submitButton)

      await waitFor(() => {
        const errorMessage = screen.getByText(
          /maximum 2 countries per day exceeded/i
        )
        expect(errorMessage).toHaveClass('text-destructive')
      })
    })

    it('does not display error initially', () => {
      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has proper labels for all inputs', () => {
      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      expect(screen.getByLabelText(/country/i)).toBeInTheDocument()
      expect(screen.getByText('Date Range')).toBeInTheDocument()
    })

    it('submit button has proper type', () => {
      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      expect(
        screen.getByRole('button', { name: /add visit/i })
      ).toHaveAttribute('type', 'submit')
    })

    it('country dropdown buttons have proper type', async () => {
      const user = userEvent.setup()
      vi.mocked(countries.searchCountries).mockReturnValue(mockCountries)

      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      const input = screen.getByLabelText(/country/i, { selector: 'input' })
      await user.type(input, 'uni')

      const usaButton = screen.getByRole('button', { name: 'United States' })
      expect(usaButton).toHaveAttribute('type', 'button')
    })
  })

  describe('form styling', () => {
    it('applies correct styles to inputs', () => {
      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      const countryInput = screen.getByLabelText(/country/i, {
        selector: 'input',
      })
      expect(countryInput).toHaveClass('border')
      expect(countryInput).toHaveClass('rounded-md')
    })

    it('submit button shows disabled state', () => {
      render(
        <CountryInput
          year={year}
          calendarData={mockCalendarData}
          onDataChange={mockOnDataChange}
        />
      )

      const submitButton = screen.getByRole('button', { name: /add visit/i })
      expect(submitButton).toHaveClass('disabled:opacity-50')
      expect(submitButton).toHaveClass('disabled:pointer-events-none')
    })
  })
})
