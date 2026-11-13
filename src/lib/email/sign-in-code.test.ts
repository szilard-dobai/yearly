import { describe, expect, it } from 'vitest'
import { SIGN_IN_CODE_MINUTES, signInCodeEmail } from './sign-in-code'

describe('signInCodeEmail', () => {
  it('puts the code in the subject so it shows in notifications', () => {
    const email = signInCodeEmail('ana@example.com', '482913')

    expect(email.to).toBe('ana@example.com')
    expect(email.subject).toBe('482913 is your Yearly sign-in code')
  })

  it('puts the code and its expiry in both versions', () => {
    const email = signInCodeEmail('ana@example.com', '482913')

    for (const body of [email.text, email.html]) {
      expect(body).toContain('482913')
      expect(body).toContain(`${SIGN_IN_CODE_MINUTES} minutes`)
    }
  })
})
