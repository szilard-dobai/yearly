import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Settings from './Settings'

describe('Settings', () => {
  const mockOnFlagDisplayModeChange = vi.fn()
  const mockOnWeekStartsOnChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Flag display mode', () => {
    it('should render flag display mode switch', () => {
      render(
        <Settings
          flagDisplayMode="emoji"
          onFlagDisplayModeChange={mockOnFlagDisplayModeChange}
          weekStartsOn={0}
          onWeekStartsOnChange={mockOnWeekStartsOnChange}
        />
      )

      expect(
        screen.getByRole('switch', { name: /use flag icons/i })
      ).toBeInTheDocument()
    })

    it('should show switch as unchecked when mode is emoji', () => {
      render(
        <Settings
          flagDisplayMode="emoji"
          onFlagDisplayModeChange={mockOnFlagDisplayModeChange}
          weekStartsOn={0}
          onWeekStartsOnChange={mockOnWeekStartsOnChange}
        />
      )

      const switchElement = screen.getByRole('switch')
      expect(switchElement).not.toBeChecked()
    })

    it('should show switch as checked when mode is icon', () => {
      render(
        <Settings
          flagDisplayMode="icon"
          onFlagDisplayModeChange={mockOnFlagDisplayModeChange}
          weekStartsOn={0}
          onWeekStartsOnChange={mockOnWeekStartsOnChange}
        />
      )

      const switchElement = screen.getByRole('switch')
      expect(switchElement).toBeChecked()
    })

    it('should call onFlagDisplayModeChange with icon when switch is enabled', async () => {
      const user = userEvent.setup()
      render(
        <Settings
          flagDisplayMode="emoji"
          onFlagDisplayModeChange={mockOnFlagDisplayModeChange}
          weekStartsOn={0}
          onWeekStartsOnChange={mockOnWeekStartsOnChange}
        />
      )

      const switchElement = screen.getByRole('switch')
      await user.click(switchElement)

      expect(mockOnFlagDisplayModeChange).toHaveBeenCalledWith('icon')
      expect(mockOnFlagDisplayModeChange).toHaveBeenCalledTimes(1)
    })

    it('should call onFlagDisplayModeChange with emoji when switch is disabled', async () => {
      const user = userEvent.setup()
      render(
        <Settings
          flagDisplayMode="icon"
          onFlagDisplayModeChange={mockOnFlagDisplayModeChange}
          weekStartsOn={0}
          onWeekStartsOnChange={mockOnWeekStartsOnChange}
        />
      )

      const switchElement = screen.getByRole('switch')
      await user.click(switchElement)

      expect(mockOnFlagDisplayModeChange).toHaveBeenCalledWith('emoji')
      expect(mockOnFlagDisplayModeChange).toHaveBeenCalledTimes(1)
    })
  })

  describe('Week starts on', () => {
    it('should render week starts on dropdown', () => {
      render(
        <Settings
          flagDisplayMode="emoji"
          onFlagDisplayModeChange={mockOnFlagDisplayModeChange}
          weekStartsOn={0}
          onWeekStartsOnChange={mockOnWeekStartsOnChange}
        />
      )

      expect(screen.getByText('Week starts on')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('should show Sunday when weekStartsOn is 0', () => {
      render(
        <Settings
          flagDisplayMode="emoji"
          onFlagDisplayModeChange={mockOnFlagDisplayModeChange}
          weekStartsOn={0}
          onWeekStartsOnChange={mockOnWeekStartsOnChange}
        />
      )

      expect(screen.getByRole('combobox')).toHaveTextContent('Sunday')
    })

    it('should show Monday when weekStartsOn is 1', () => {
      render(
        <Settings
          flagDisplayMode="emoji"
          onFlagDisplayModeChange={mockOnFlagDisplayModeChange}
          weekStartsOn={1}
          onWeekStartsOnChange={mockOnWeekStartsOnChange}
        />
      )

      expect(screen.getByRole('combobox')).toHaveTextContent('Monday')
    })

    it('should call onWeekStartsOnChange when day is selected', async () => {
      const user = userEvent.setup()
      render(
        <Settings
          flagDisplayMode="emoji"
          onFlagDisplayModeChange={mockOnFlagDisplayModeChange}
          weekStartsOn={0}
          onWeekStartsOnChange={mockOnWeekStartsOnChange}
        />
      )

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      const mondayOption = await screen.findByRole('option', { name: 'Monday' })
      await user.click(mondayOption)

      expect(mockOnWeekStartsOnChange).toHaveBeenCalledWith(1)
      expect(mockOnWeekStartsOnChange).toHaveBeenCalledTimes(1)
    })

    it('should render all 7 days of the week in dropdown', async () => {
      const user = userEvent.setup()
      render(
        <Settings
          flagDisplayMode="emoji"
          onFlagDisplayModeChange={mockOnFlagDisplayModeChange}
          weekStartsOn={0}
          onWeekStartsOnChange={mockOnWeekStartsOnChange}
        />
      )

      const combobox = screen.getByRole('combobox')
      await user.click(combobox)

      const days = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ]

      for (const day of days) {
        expect(await screen.findByRole('option', { name: day })).toBeInTheDocument()
      }
    })
  })

  describe('Labels and descriptions', () => {
    it('should have label for flag display mode', () => {
      render(
        <Settings
          flagDisplayMode="emoji"
          onFlagDisplayModeChange={mockOnFlagDisplayModeChange}
          weekStartsOn={0}
          onWeekStartsOnChange={mockOnWeekStartsOnChange}
        />
      )

      expect(screen.getByText('Use flag icons')).toBeInTheDocument()
      expect(
        screen.getByText(/display country flags as icons instead of emoji/i)
      ).toBeInTheDocument()
    })

    it('should have label for week starts on', () => {
      render(
        <Settings
          flagDisplayMode="emoji"
          onFlagDisplayModeChange={mockOnFlagDisplayModeChange}
          weekStartsOn={0}
          onWeekStartsOnChange={mockOnWeekStartsOnChange}
        />
      )

      expect(screen.getByText('Week starts on')).toBeInTheDocument()
    })
  })
})
