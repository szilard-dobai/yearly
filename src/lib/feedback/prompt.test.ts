import { beforeEach, describe, expect, it } from 'vitest'
import {
  markFeedbackPromptDismissed,
  markFeedbackPromptShown,
  markFeedbackSubmitted,
  PROMPT_COOLDOWNS_MS,
  shouldShowFeedbackPrompt,
} from './prompt'

const NOW = new Date('2026-11-04T12:00:00Z').getTime()

describe('feedback prompt cooldowns', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('shows the prompt when nothing has happened yet', () => {
    expect(shouldShowFeedbackPrompt(NOW)).toBe(true)
  })

  it.each([
    ['shown', markFeedbackPromptShown, PROMPT_COOLDOWNS_MS.shown],
    ['dismissed', markFeedbackPromptDismissed, PROMPT_COOLDOWNS_MS.dismissed],
    ['submitted', markFeedbackSubmitted, PROMPT_COOLDOWNS_MS.submitted],
  ])('waits for the %s cooldown', (_, mark, cooldown) => {
    mark(NOW)
    expect(shouldShowFeedbackPrompt(NOW + cooldown - 1)).toBe(false)
    expect(shouldShowFeedbackPrompt(NOW + cooldown)).toBe(true)
  })

  it('keeps the longest active cooldown', () => {
    markFeedbackSubmitted(NOW)
    markFeedbackPromptShown(NOW)
    expect(shouldShowFeedbackPrompt(NOW + PROMPT_COOLDOWNS_MS.shown)).toBe(
      false
    )
  })

  it('ignores corrupted storage', () => {
    localStorage.setItem('yearly_feedback_prompt', '{not json')
    expect(shouldShowFeedbackPrompt(NOW)).toBe(true)

    localStorage.setItem(
      'yearly_feedback_prompt',
      JSON.stringify({ shownAt: 'yesterday' })
    )
    expect(shouldShowFeedbackPrompt(NOW)).toBe(true)
  })
})
