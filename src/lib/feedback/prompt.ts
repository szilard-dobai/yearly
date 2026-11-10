const PROMPT_STORAGE_KEY = 'yearly_feedback_prompt'
const DAY_MS = 24 * 60 * 60 * 1000

export const PROMPT_COOLDOWNS_MS = {
  submitted: 90 * DAY_MS,
  dismissed: 30 * DAY_MS,
  shown: 3 * DAY_MS,
} as const

const listeners = new Set<() => void>()

interface PromptState {
  shownAt?: number
  dismissedAt?: number
  submittedAt?: number
}

function readState(): PromptState {
  try {
    const raw = localStorage.getItem(PROMPT_STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const state: PromptState = {}
    for (const key of ['shownAt', 'dismissedAt', 'submittedAt'] as const) {
      const value = (parsed as Record<string, unknown>)[key]
      if (typeof value === 'number' && Number.isFinite(value)) {
        state[key] = value
      }
    }
    return state
  } catch {
    return {}
  }
}

function writeState(patch: PromptState): void {
  try {
    localStorage.setItem(
      PROMPT_STORAGE_KEY,
      JSON.stringify({ ...readState(), ...patch })
    )
  } catch {
    // Storage can be unavailable (private mode, quota); prompting is best-effort
  }
  listeners.forEach((listener) => listener())
}

export function subscribeToFeedbackPrompt(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function isWithin(
  timestamp: number | undefined,
  windowMs: number,
  now: number
) {
  return timestamp !== undefined && now - timestamp < windowMs
}

export function canAskForFeedback(now = Date.now()): boolean {
  const state = readState()
  return !(
    isWithin(state.submittedAt, PROMPT_COOLDOWNS_MS.submitted, now) ||
    isWithin(state.dismissedAt, PROMPT_COOLDOWNS_MS.dismissed, now)
  )
}

export function shouldShowFeedbackPrompt(now = Date.now()): boolean {
  return (
    canAskForFeedback(now) &&
    !isWithin(readState().shownAt, PROMPT_COOLDOWNS_MS.shown, now)
  )
}

export function markFeedbackPromptShown(now = Date.now()): void {
  writeState({ shownAt: now })
}

export function markFeedbackPromptDismissed(now = Date.now()): void {
  writeState({ dismissedAt: now })
}

export function markFeedbackSubmitted(now = Date.now()): void {
  writeState({ submittedAt: now })
}
