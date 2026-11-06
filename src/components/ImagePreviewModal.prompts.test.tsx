import { trackEvent } from '@/lib/tracking'
import type { CalendarData } from '@/lib/types'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ImagePreviewModal from './ImagePreviewModal'

vi.mock('./AnimatedVideoDialog', () => ({ default: () => null }))

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
  getDeviceType: () => 'desktop',
}))

vi.mock('@/lib/tracking/device-id', () => ({
  getDeviceId: () => 'device-123',
}))

const calendarData: CalendarData = {
  visits: [{ id: '1', countryCode: 'JP', date: new Date(2026, 2, 20) }],
}

const SURVEY = 'How did you hear about Yearly?'
const FEEDBACK = 'Enjoying Yearly?'

function renderModal() {
  return render(
    <ImagePreviewModal
      open
      onOpenChange={vi.fn()}
      imageDataUrl="data:image/jpeg;base64,AAAA"
      filename="yearly.jpg"
      year={2026}
      calendarData={calendarData}
      exportType="calendar"
    />
  )
}

async function download() {
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: /Download Image/ }))
  return user
}

function shownPrompts() {
  return vi
    .mocked(trackEvent)
    .mock.calls.map(([type]) => type)
    .filter((type) => type.endsWith('_shown'))
}

describe('ImagePreviewModal post-download prompts', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(trackEvent).mockClear()
  })

  it('asks where the user heard about Yearly before asking for a rating', async () => {
    renderModal()
    await download()

    expect(screen.getByText(SURVEY)).toBeInTheDocument()
    expect(screen.queryByText(FEEDBACK)).not.toBeInTheDocument()
    expect(trackEvent).toHaveBeenCalledWith('acquisition_survey_shown', {
      exportType: 'calendar',
      year: 2026,
      showCount: 1,
    })
    expect(shownPrompts()).toEqual(['acquisition_survey_shown'])
  })

  it('shows one prompt per modal, even across downloads', async () => {
    renderModal()
    const user = await download()
    await user.click(screen.getByRole('button', { name: 'Dismiss question' }))
    await user.click(screen.getByRole('button', { name: /Download Image/ }))

    expect(screen.queryByText(SURVEY)).not.toBeInTheDocument()
    expect(screen.queryByText(FEEDBACK)).not.toBeInTheDocument()
    expect(shownPrompts()).toEqual(['acquisition_survey_shown'])
  })

  it('falls back to the rating prompt once the survey is answered', async () => {
    localStorage.setItem(
      'yearly_acquisition_survey',
      JSON.stringify({ shownCount: 1, answeredAt: Date.now() })
    )
    renderModal()
    await download()

    expect(screen.getByText(FEEDBACK)).toBeInTheDocument()
    expect(screen.queryByText(SURVEY)).not.toBeInTheDocument()
    expect(shownPrompts()).toEqual(['feedback_prompt_shown'])
  })

  it('falls back to the rating prompt after three ignored surveys', async () => {
    for (let modal = 0; modal < 3; modal++) {
      const { unmount } = renderModal()
      await download()
      expect(screen.getByText(SURVEY)).toBeInTheDocument()
      unmount()
    }

    renderModal()
    await download()

    expect(screen.getByText(FEEDBACK)).toBeInTheDocument()
    expect(shownPrompts()).toEqual([
      'acquisition_survey_shown',
      'acquisition_survey_shown',
      'acquisition_survey_shown',
      'feedback_prompt_shown',
    ])
  })

  it('shows neither while both are cooling down', async () => {
    localStorage.setItem(
      'yearly_acquisition_survey',
      JSON.stringify({ dismissedAt: Date.now() })
    )
    localStorage.setItem(
      'yearly_feedback_prompt',
      JSON.stringify({ shownAt: Date.now() })
    )
    renderModal()
    await download()

    expect(screen.queryByText(SURVEY)).not.toBeInTheDocument()
    expect(screen.queryByText(FEEDBACK)).not.toBeInTheDocument()
    expect(shownPrompts()).toEqual([])
  })
})
