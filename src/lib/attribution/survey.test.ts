import { beforeEach, describe, expect, it } from 'vitest'
import {
  buildSurveyAnswer,
  getSurveyAnswerLabel,
  markAcquisitionSurveyAnswered,
  markAcquisitionSurveyDismissed,
  markAcquisitionSurveyShown,
  shouldShowAcquisitionSurvey,
  SURVEY_MAX_SHOWS,
} from './survey'

describe('acquisition survey frequency', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('asks a device that has never seen it', () => {
    expect(shouldShowAcquisitionSurvey()).toBe(true)
  })

  it('asks again after being ignored, up to three times', () => {
    expect(SURVEY_MAX_SHOWS).toBe(3)
    expect(markAcquisitionSurveyShown()).toBe(1)
    expect(shouldShowAcquisitionSurvey()).toBe(true)
    expect(markAcquisitionSurveyShown()).toBe(2)
    expect(shouldShowAcquisitionSurvey()).toBe(true)
    expect(markAcquisitionSurveyShown()).toBe(3)
    expect(shouldShowAcquisitionSurvey()).toBe(false)
  })

  it('stops for good once answered', () => {
    markAcquisitionSurveyShown()
    markAcquisitionSurveyAnswered()
    expect(shouldShowAcquisitionSurvey()).toBe(false)
  })

  it('stops for good once dismissed', () => {
    markAcquisitionSurveyShown()
    markAcquisitionSurveyDismissed()
    expect(shouldShowAcquisitionSurvey()).toBe(false)
  })

  it('ignores corrupted storage', () => {
    localStorage.setItem('yearly_acquisition_survey', '{not json')
    expect(shouldShowAcquisitionSurvey()).toBe(true)

    localStorage.setItem(
      'yearly_acquisition_survey',
      JSON.stringify({ shownCount: 'lots', dismissedAt: null })
    )
    expect(shouldShowAcquisitionSurvey()).toBe(true)
    expect(markAcquisitionSurveyShown()).toBe(1)
  })
})

describe('buildSurveyAnswer', () => {
  it('sends just the answer for a preset choice', () => {
    expect(buildSurveyAnswer('saw_image')).toEqual({ answer: 'saw_image' })
  })

  it('trims and caps the free text for Other', () => {
    expect(buildSurveyAnswer('other', `  ${'a'.repeat(250)}  `)).toEqual({
      answer: 'other',
      otherText: 'a'.repeat(200),
    })
  })

  it('leaves out blank free text', () => {
    expect(buildSurveyAnswer('other', '   ')).toEqual({ answer: 'other' })
  })
})

describe('getSurveyAnswerLabel', () => {
  it('keeps the two sharing answers apart', () => {
    expect(getSurveyAnswerLabel('saw_image')).toBe("Saw someone's Yearly image")
    expect(getSurveyAnswerLabel('friend_link')).toBe(
      'A friend sent me the link'
    )
  })

  it('falls back to the raw value', () => {
    expect(getSurveyAnswerLabel('carrier_pigeon')).toBe('carrier_pigeon')
  })
})
