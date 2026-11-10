import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  canAskForFeedback,
  markFeedbackPromptDismissed,
  markFeedbackPromptShown,
  markFeedbackSubmitted,
  PROMPT_COOLDOWNS_MS,
  shouldShowFeedbackPrompt,
  subscribeToFeedbackPrompt,
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

  it('still allows asking elsewhere while only the shown cooldown is active', () => {
    markFeedbackPromptShown(NOW)
    expect(shouldShowFeedbackPrompt(NOW + 1)).toBe(false)
    expect(canAskForFeedback(NOW + 1)).toBe(true)
  })

  it.each([
    ['dismissed', markFeedbackPromptDismissed, PROMPT_COOLDOWNS_MS.dismissed],
    ['submitted', markFeedbackSubmitted, PROMPT_COOLDOWNS_MS.submitted],
  ])('stops asking anywhere for the %s cooldown', (_, mark, cooldown) => {
    mark(NOW)
    expect(canAskForFeedback(NOW + cooldown - 1)).toBe(false)
    expect(canAskForFeedback(NOW + cooldown)).toBe(true)
  })

  it('notifies subscribers when the state changes', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToFeedbackPrompt(listener)

    markFeedbackSubmitted(NOW)
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    markFeedbackPromptDismissed(NOW)
    expect(listener).toHaveBeenCalledTimes(1)
  })
})
