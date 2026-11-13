import { describe, expect, it } from 'vitest'
import { DEFAULT_NEXT_PATH, safeNextPath } from './next-path'

describe('safeNextPath', () => {
  it('keeps paths on this site', () => {
    expect(safeNextPath('/create')).toBe('/create')
    expect(safeNextPath('/account?tab=videos')).toBe('/account?tab=videos')
  })

  it('uses the first value when the parameter repeats', () => {
    expect(safeNextPath(['/create', '/account'])).toBe('/create')
  })

  it.each([
    undefined,
    '',
    'create',
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/sign-in',
    '/sign-in?next=/account',
    '/api/auth/sign-out',
  ])('falls back to the account page for %j', (value) => {
    expect(safeNextPath(value)).toBe(DEFAULT_NEXT_PATH)
  })
})
