import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { withProductName } from './ProductName'

function renderNames(text: string) {
  const { container } = render(<p>{withProductName(text)}</p>)
  return {
    paragraph: container.querySelector('p'),
    names: Array.from(container.querySelectorAll('[translate="no"]')),
  }
}

describe('withProductName', () => {
  it('keeps each Yearly out of browser translation and the rest as text', () => {
    const { paragraph, names } = renderNames('Is Yearly free? Yearly is.')

    expect(paragraph).toHaveTextContent('Is Yearly free? Yearly is.')
    expect(names).toHaveLength(2)
  })

  it('puts the spaces around the name inside it, where translation keeps them', () => {
    expect(renderNames('Is Yearly free?').names[0].textContent).toBe(' Yearly ')
  })

  it('adds no space next to punctuation or the start of the text', () => {
    expect(renderNames('Enjoying Yearly?').names[0].textContent).toBe(' Yearly')
    expect(renderNames("Yearly's admin pages").names[0].textContent).toBe(
      'Yearly'
    )
  })

  it('keeps the spaces in the accessible name', () => {
    render(<button>{withProductName("Saw someone's Yearly image")}</button>)

    expect(
      screen.getByRole('button', { name: "Saw someone's Yearly image" })
    ).toBeInTheDocument()
  })

  it('leaves text without the name as it is', () => {
    expect(withProductName('When can I buy one?')).toEqual([
      'When can I buy one?',
    ])
  })
})
