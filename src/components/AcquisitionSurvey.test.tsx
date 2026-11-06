import { trackEvent } from '@/lib/tracking'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AcquisitionSurvey from './AcquisitionSurvey'

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
  getDeviceType: () => 'mobile',
}))

function storedState() {
  return JSON.parse(localStorage.getItem('yearly_acquisition_survey') ?? '{}')
}

describe('AcquisitionSurvey', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(trackEvent).mockClear()
  })

  it('records a one-tap answer and says thanks', async () => {
    const user = userEvent.setup()
    render(<AcquisitionSurvey onDismiss={vi.fn()} />)

    await user.click(
      screen.getByRole('button', { name: "Saw someone's Yearly image" })
    )

    expect(trackEvent).toHaveBeenCalledWith('acquisition_survey_answered', {
      answer: 'saw_image',
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Thanks!')
    expect(storedState()).toHaveProperty('answeredAt')
  })

  it('offers every answer as its own chip', () => {
    render(<AcquisitionSurvey onDismiss={vi.fn()} />)

    const group = screen.getByRole('group', {
      name: 'How did you hear about Yearly?',
    })
    expect(group.querySelectorAll('button')).toHaveLength(12)
    expect(
      screen.getByRole('button', { name: 'A friend sent me the link' })
    ).toBeInTheDocument()
  })

  it('lets Other add a short note before sending', async () => {
    const user = userEvent.setup()
    render(<AcquisitionSurvey onDismiss={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Other' }))
    expect(trackEvent).not.toHaveBeenCalled()

    await user.type(
      screen.getByRole('textbox', { name: /Where did you hear/ }),
      '  Lemon8 post  '
    )
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(trackEvent).toHaveBeenCalledWith('acquisition_survey_answered', {
      answer: 'other',
      otherText: 'Lemon8 post',
    })
    expect(await screen.findByRole('status')).toBeInTheDocument()
  })

  it('sends Other without a note', async () => {
    const user = userEvent.setup()
    render(<AcquisitionSurvey onDismiss={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Other' }))
    await user.click(screen.getByRole('button', { name: 'Send' }))

    expect(trackEvent).toHaveBeenCalledWith('acquisition_survey_answered', {
      answer: 'other',
    })
  })

  it('records the dismissal and hides itself for good', async () => {
    const user = userEvent.setup()
    const onDismiss = vi.fn()
    render(<AcquisitionSurvey onDismiss={onDismiss} />)

    await user.click(screen.getByRole('button', { name: 'Dismiss question' }))

    expect(onDismiss).toHaveBeenCalled()
    expect(trackEvent).toHaveBeenCalledWith('acquisition_survey_dismissed')
    expect(storedState()).toHaveProperty('dismissedAt')
  })
})
