const SURVEY_STORAGE_KEY = 'yearly_acquisition_survey'

export const SURVEY_MAX_SHOWS = 3
export const SURVEY_OTHER_TEXT_MAX_LENGTH = 200

export const SURVEY_ANSWERS = [
  { value: 'instagram', label: 'Instagram' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'threads', label: 'Threads' },
  { value: 'xiaohongshu', label: 'Xiaohongshu' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'reddit', label: 'Reddit' },
  { value: 'x', label: 'X' },
  { value: 'saw_image', label: "Saw someone's Yearly image" },
  { value: 'friend_link', label: 'A friend sent me the link' },
  { value: 'google', label: 'Google' },
  { value: 'ai', label: 'ChatGPT or another AI' },
  { value: 'other', label: 'Other' },
] as const

export type SurveyAnswer = (typeof SURVEY_ANSWERS)[number]['value']

export type AcquisitionSurveyAnsweredMetadata = {
  answer: SurveyAnswer
  otherText?: string
}

export function getSurveyAnswerLabel(value: string): string {
  return SURVEY_ANSWERS.find((answer) => answer.value === value)?.label ?? value
}

export function buildSurveyAnswer(
  answer: SurveyAnswer,
  otherText = ''
): AcquisitionSurveyAnsweredMetadata {
  const text = otherText.trim().slice(0, SURVEY_OTHER_TEXT_MAX_LENGTH)
  return answer === 'other' && text ? { answer, otherText: text } : { answer }
}

interface SurveyState {
  shownCount?: number
  answeredAt?: number
  dismissedAt?: number
}

function readState(): SurveyState {
  try {
    const raw = localStorage.getItem(SURVEY_STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    const state: SurveyState = {}
    for (const key of ['shownCount', 'answeredAt', 'dismissedAt'] as const) {
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

function writeState(patch: SurveyState): void {
  try {
    localStorage.setItem(
      SURVEY_STORAGE_KEY,
      JSON.stringify({ ...readState(), ...patch })
    )
  } catch {
    // Storage can be unavailable (private mode, quota); prompting is best-effort
  }
}

export function shouldShowAcquisitionSurvey(): boolean {
  const state = readState()
  return (
    state.answeredAt === undefined &&
    state.dismissedAt === undefined &&
    (state.shownCount ?? 0) < SURVEY_MAX_SHOWS
  )
}

export function markAcquisitionSurveyShown(): number {
  const shownCount = (readState().shownCount ?? 0) + 1
  writeState({ shownCount })
  return shownCount
}

export function markAcquisitionSurveyAnswered(now = Date.now()): void {
  writeState({ answeredAt: now })
}

export function markAcquisitionSurveyDismissed(now = Date.now()): void {
  writeState({ dismissedAt: now })
}
