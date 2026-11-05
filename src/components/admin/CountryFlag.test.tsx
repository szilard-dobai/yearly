import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CountryFlag from './CountryFlag'

describe('CountryFlag', () => {
  it('names the country on hover and for screen readers', () => {
    render(<CountryFlag code="DE" />)

    const flag = screen.getByRole('img', { name: 'Germany' })
    expect(flag).toHaveTextContent('🇩🇪')
    expect(flag).toHaveAttribute('title', 'Germany')
  })

  it('falls back to the code for unlisted countries', () => {
    render(<CountryFlag code="ZZ" />)

    expect(screen.getByRole('img', { name: 'ZZ' })).toHaveAttribute(
      'title',
      'ZZ'
    )
  })
})
