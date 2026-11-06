import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { HOMEPAGE_EXAMPLES } from '@/lib/homepage-examples'
import { HomepageExamples } from './HomepageExamples'

vi.mock('@/components/AnimatedSection', () => ({
  AnimatedSection: ({
    children,
    className,
  }: PropsWithChildren<{ className?: string }>) => (
    <div className={className}>{children}</div>
  ),
}))

describe('HomepageExamples', () => {
  it('renders a labelled section with a heading', () => {
    render(<HomepageExamples />)

    expect(
      screen.getByRole('region', { name: 'What your Yearly looks like' })
    ).toBeInTheDocument()
  })

  it('renders every example export with specific alt text', () => {
    render(<HomepageExamples />)
    const images = screen.getAllByRole('img')

    expect(images).toHaveLength(HOMEPAGE_EXAMPLES.length)
    images.forEach((image, idx) => {
      const alt = image.getAttribute('alt') ?? ''
      expect(alt.trim()).not.toBe('')
      expect(alt).toBe(HOMEPAGE_EXAMPLES[idx].alt)
      expect(alt).toContain('Yearly')
    })
  })

  it('lazy loads the images at their intrinsic size', () => {
    render(<HomepageExamples />)

    screen.getAllByRole('img').forEach((image, idx) => {
      expect(image).toHaveAttribute('loading', 'lazy')
      expect(image).toHaveAttribute('sizes')
      expect(image).toHaveAttribute(
        'width',
        String(HOMEPAGE_EXAMPLES[idx].width)
      )
      expect(image).toHaveAttribute(
        'height',
        String(HOMEPAGE_EXAMPLES[idx].height)
      )
    })
  })

  it('captions each example', () => {
    render(<HomepageExamples />)

    HOMEPAGE_EXAMPLES.forEach(({ caption }) => {
      expect(screen.getByText(caption)).toBeInTheDocument()
    })
  })
})
