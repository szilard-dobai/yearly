import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { withProductName } from './ProductName'

describe('withProductName', () => {
  it('keeps each Yearly out of browser translation and the rest as text', () => {
    const { container } = render(
      <p>{withProductName('Is Yearly free? Yearly is.')}</p>
    )

    expect(container).toHaveTextContent('Is Yearly free? Yearly is.')
    expect(container.querySelectorAll('[translate="no"]')).toHaveLength(2)
  })

  it('leaves text without the name as it is', () => {
    expect(withProductName('When can I buy one?')).toEqual([
      'When can I buy one?',
    ])
  })
})
