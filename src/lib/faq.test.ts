import { describe, expect, it } from 'vitest'
import { faqs } from './faq'

describe('faqs', () => {
  it('answers the account questions right after the price', () => {
    const questions = faqs.map((faq) => faq.question)

    expect(questions.slice(0, 4)).toEqual([
      'Is Yearly free?',
      'Do I need an account?',
      'Why create an account?',
      'Where are my trips stored?',
    ])
    expect(new Set(questions).size).toBe(questions.length)
  })

  it('says an account is optional and that Yearly works without one', () => {
    const answer = faqs.find(
      (faq) => faq.question === 'Do I need an account?'
    )?.answer

    expect(answer).toMatch(/^No\./)
    expect(answer).toContain('An account is optional and free')
  })

  it('says what is stored with and without an account', () => {
    const answer = faqs.find(
      (faq) => faq.question === 'Where are my trips stored?'
    )?.answer

    expect(answer).toContain(
      'If you sign in, we also save them to your account'
    )
    expect(answer).toContain('we never receive your travel dates')
  })
})
