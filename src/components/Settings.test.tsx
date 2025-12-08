import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithSettings } from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
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

      const switchElement = screen.getByRole('switch', { name: /use flag icons/i })
      expect(switchElement).not.toBeChecked()
    })

    it('should toggle switch when clicked', async () => {
      const user = userEvent.setup()
      renderWithSettings(<Settings {...defaultProps} />)

      const switchElement = screen.getByRole('switch', { name: /use flag icons/i })
      expect(switchElement).not.toBeChecked()

      await user.click(switchElement)
      expect(switchElement).toBeChecked()

      await user.click(switchElement)
      expect(switchElement).not.toBeChecked()
    })
  })

  describe('Week starts on', () => {
    it('should render week starts on dropdown', () => {
      renderWithSettings(<Settings {...defaultProps} />)

      expect(screen.getByText('Week starts on')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('should show Sunday when weekStartsOn is 0 (default)', () => {
      renderWithSettings(<Settings {...defaultProps} />)

      expect(screen.getByRole('combobox')).toHaveTextContent('Sunday')
    })

    it('should allow changing the week start day', async () => {
      const user = userEvent.setup()
      renderWithSettings(<Settings {...defaultProps} />)

      const combobox = screen.getByRole('combobox')
      expect(combobox).toHaveTextContent('Sunday')

      await user.click(combobox)

      const mondayOption = await screen.findByRole('option', { name: 'Monday' })
      await user.click(mondayOption)

      // After selection, the combobox should show Monday
      expect(combobox).toHaveTextContent('Monday')
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
        expect(await screen.findByRole('option', { name: day })).toBeInTheDocument()
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
