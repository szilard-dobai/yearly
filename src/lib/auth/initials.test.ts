import { describe, expect, it } from 'vitest'
import { getInitials } from './initials'

describe('getInitials', () => {
  it('uses the first and last name', () => {
    expect(getInitials('Szilard Dobai', 'sd@example.com')).toBe('SD')
    expect(getInitials('Ana María de la Cruz', 'ana@example.com')).toBe('AC')
  })

  it('uses one letter for a single name', () => {
    expect(getInitials('ana', 'ana@example.com')).toBe('A')
  })

  it('falls back to the email when there is no name', () => {
    expect(getInitials('', 'ben@example.com')).toBe('B')
    expect(getInitials('   ', 'ben@example.com')).toBe('B')
    expect(getInitials(null, 'ben@example.com')).toBe('B')
  })

  it('keeps characters outside the Latin alphabet whole', () => {
    expect(getInitials('Łukasz Żak', 'l@example.com')).toBe('ŁŻ')
    expect(getInitials('山田 太郎', 'y@example.com')).toBe('山太')
  })
})
