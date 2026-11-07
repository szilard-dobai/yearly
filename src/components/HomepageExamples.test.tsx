import { beforeEach, describe, it, expect, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import type { PropsWithChildren } from 'react'
import { renderWithSettings, screen, TestWrapper } from '@/test/test-utils'
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

function variantsFor(alt: string) {
  const images = screen.getAllByAltText(alt)
  return {
    light: images.find((image) => image.dataset.variant === 'light')!,
    dark: images.find((image) => image.dataset.variant === 'dark')!,
  }
}

function sourceOf(image: HTMLElement) {
  return decodeURIComponent(image.getAttribute('src') ?? '')
}

function storeColorScheme(colorScheme: 'light' | 'dark') {
  localStorage.setItem(
    'countries-in-year-settings',
    JSON.stringify({ colorScheme })
  )
}

describe('HomepageExamples', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders a labelled section with a heading', () => {
    renderWithSettings(<HomepageExamples />)

    expect(
      screen.getByRole('region', { name: 'What your Yearly looks like' })
    ).toBeInTheDocument()
  })

  it('renders a light and a dark image for every example with specific alt text', () => {
    renderWithSettings(<HomepageExamples />)

    expect(screen.getAllByRole('img')).toHaveLength(
      HOMEPAGE_EXAMPLES.length * 2
    )
    HOMEPAGE_EXAMPLES.forEach((example) => {
      const { light, dark } = variantsFor(example.alt)

      expect(example.alt.trim()).not.toBe('')
      expect(example.alt).toContain('Yearly')
      expect(sourceOf(light)).toContain(example.light.src)
      expect(sourceOf(dark)).toContain(example.dark.src)
    })
  })

  it('hides both images until the colour scheme is known', () => {
    const container = document.createElement('div')
    container.innerHTML = renderToString(
      <TestWrapper>
        <HomepageExamples />
      </TestWrapper>
    )
    const images = container.querySelectorAll('img')

    expect(images).toHaveLength(HOMEPAGE_EXAMPLES.length * 2)
    images.forEach((image) => expect(image).toHaveClass('hidden'))
  })

  it('shows only the light images in light mode', () => {
    storeColorScheme('light')
    renderWithSettings(<HomepageExamples />)

    HOMEPAGE_EXAMPLES.forEach((example) => {
      const { light, dark } = variantsFor(example.alt)

      expect(light).not.toHaveClass('hidden')
      expect(dark).toHaveClass('hidden')
    })
  })

  it('shows only the dark images in dark mode', () => {
    storeColorScheme('dark')
    renderWithSettings(<HomepageExamples />)

    HOMEPAGE_EXAMPLES.forEach((example) => {
      const { light, dark } = variantsFor(example.alt)

      expect(light).toHaveClass('hidden')
      expect(dark).not.toHaveClass('hidden')
    })
  })

  it('lazy loads both variants at their intrinsic size', () => {
    renderWithSettings(<HomepageExamples />)

    HOMEPAGE_EXAMPLES.forEach((example) => {
      const images = variantsFor(example.alt)

      for (const variant of ['light', 'dark'] as const) {
        const image = images[variant]
        expect(image).toHaveAttribute('loading', 'lazy')
        expect(image).toHaveAttribute('sizes')
        expect(image).toHaveAttribute('width', String(example[variant].width))
        expect(image).toHaveAttribute('height', String(example[variant].height))
      }
    })
  })

  it('captions each example', () => {
    renderWithSettings(<HomepageExamples />)

    HOMEPAGE_EXAMPLES.forEach(({ caption }) => {
      expect(screen.getByText(caption)).toBeInTheDocument()
    })
  })
})
