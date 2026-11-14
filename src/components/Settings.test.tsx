import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithSettings } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import { isTrackingOptedOut } from '@/lib/tracking/opt-out'
import Settings from './Settings'

const defaultProps = {
  year: 2024,
  visitCount: 5,
  onReset: vi.fn(),
}

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Flag display mode', () => {
    it('should render flag display mode switch', () => {
      renderWithSettings(<Settings {...defaultProps} />)

      expect(
        screen.getByRole('switch', { name: /use flag icons/i })
      ).toBeInTheDocument()
    })

    it('should show switch as unchecked when mode is emoji (default)', () => {
      renderWithSettings(<Settings {...defaultProps} />)

      const switchElement = screen.getByRole('switch', {
        name: /use flag icons/i,
      })
      expect(switchElement).not.toBeChecked()
    })

    it('should toggle switch when clicked', async () => {
      const user = userEvent.setup()
      renderWithSettings(<Settings {...defaultProps} />)

      const switchElement = screen.getByRole('switch', {
        name: /use flag icons/i,
      })
      expect(switchElement).not.toBeChecked()

      await user.click(switchElement)
      expect(switchElement).toBeChecked()

      await user.click(switchElement)
      expect(switchElement).not.toBeChecked()
    })
  })

  describe('Share usage stats', () => {
    it('is on by default', () => {
      localStorage.clear()
      renderWithSettings(<Settings {...defaultProps} />)

      expect(
        screen.getByRole('switch', { name: /share usage stats/i })
      ).toBeChecked()
      expect(
        screen.getByText(/never include your trip dates/i)
      ).toBeInTheDocument()
    })

    it('turns usage stats off and on for this browser', async () => {
      localStorage.clear()
      const user = userEvent.setup()
      renderWithSettings(<Settings {...defaultProps} />)
      const toggle = screen.getByRole('switch', { name: /share usage stats/i })

      await user.click(toggle)
      expect(toggle).not.toBeChecked()
      expect(isTrackingOptedOut()).toBe(true)

      await user.click(toggle)
      expect(toggle).toBeChecked()
      expect(isTrackingOptedOut()).toBe(false)
    })
  })

  describe('Week starts on', () => {
    it('should render week starts on dropdown', () => {
      renderWithSettings(<Settings {...defaultProps} />)

      expect(screen.getByText('Week starts on')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('should show Monday when weekStartsOn is 1 (default)', () => {
      renderWithSettings(<Settings {...defaultProps} />)

      expect(screen.getByRole('combobox')).toHaveTextContent('Monday')
    })

    it('should allow changing the week start day', async () => {
      const user = userEvent.setup()
      renderWithSettings(<Settings {...defaultProps} />)

      const combobox = screen.getByRole('combobox')
      expect(combobox).toHaveTextContent('Monday')

      await user.click(combobox)

      const sundayOption = await screen.findByRole('option', { name: 'Sunday' })
      await user.click(sundayOption)

      // After selection, the combobox should show Sunday
      expect(combobox).toHaveTextContent('Sunday')
    })

    it('should render all 7 days of the week in dropdown', async () => {
      const user = userEvent.setup()
      renderWithSettings(<Settings {...defaultProps} />)

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
        expect(
          await screen.findByRole('option', { name: day })
        ).toBeInTheDocument()
      }
    })
  })

  describe('Labels and descriptions', () => {
    it('should have label for flag display mode', () => {
      renderWithSettings(<Settings {...defaultProps} />)

      expect(screen.getByText('Use flag icons')).toBeInTheDocument()
      expect(
        screen.getByText(/display country flags as icons instead of emoji/i)
      ).toBeInTheDocument()
    })

    it('should have label for week starts on', () => {
      renderWithSettings(<Settings {...defaultProps} />)

      expect(screen.getByText('Week starts on')).toBeInTheDocument()
    })
  })
})
