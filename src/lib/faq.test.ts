import { describe, expect, it } from 'vitest'
import { faqs, getFaqs } from './faq'

describe('getFaqs', () => {
  it('keeps today’s answers while accounts are switched off', () => {
    expect(getFaqs(false)).toBe(faqs)
  })

  it('answers the account questions once accounts are on', () => {
    const questions = getFaqs(true).map((faq) => faq.question)

    expect(questions.slice(0, 4)).toEqual([
      'Is Yearly free?',
      'Do I need an account?',
      'Why create an account?',
      'Where are my trips stored?',
    ])
    expect(new Set(questions).size).toBe(questions.length)
  })

  it('says an account is optional and that Yearly works without one', () => {
    const answer = getFaqs(true).find(
      (faq) => faq.question === 'Do I need an account?'
    )?.answer

    expect(answer).toMatch(/^No\./)
    expect(answer).toContain('An account is optional and free')
  })

  it('says what is stored with and without an account', () => {
    const answer = getFaqs(true).find(
      (faq) => faq.question === 'Where are my trips stored?'
    )?.answer

    expect(answer).toContain(
      'If you sign in, we also save them to your account'
    )
    expect(answer).toContain('we never receive your travel dates')
  })
})
