import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'
import { renderWithSettings, screen, TestWrapper } from '@/test/test-utils'
import { HERO_IMAGE } from '@/lib/homepage-examples'
import { CalendarMockup } from './CalendarMockup'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function mockSystemColorScheme(scheme: 'light' | 'dark') {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: query === DARK_QUERY && scheme === 'dark',
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList
  )
}

function storeColorScheme(colorScheme: 'light' | 'dark') {
  localStorage.setItem(
    'countries-in-year-settings',
    JSON.stringify({ colorScheme })
  )
}

function heroParts(root: ParentNode) {
  const source = root.querySelector('picture source')
  const image = root.querySelector('picture img')
  return { source, image }
}

describe('CalendarMockup', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders one hero picture that lets the browser pick the dark source', () => {
    const container = document.createElement('div')
    container.innerHTML = renderToString(
      <TestWrapper>
        <CalendarMockup />
      </TestWrapper>
    )
    const { source, image } = heroParts(container)

    expect(container.querySelectorAll('img')).toHaveLength(1)
    expect(source).toHaveAttribute('media', DARK_QUERY)
    expect(decodeURIComponent(source?.getAttribute('srcset') ?? '')).toContain(
      HERO_IMAGE.dark.src
    )
    expect(decodeURIComponent(image?.getAttribute('srcset') ?? '')).toContain(
      HERO_IMAGE.light.src
    )
  })

  it('loads the hero eagerly at high priority with its real size and alt text', () => {
    renderWithSettings(<CalendarMockup />)
    const image = screen.getByAltText(HERO_IMAGE.alt)

    expect(HERO_IMAGE.alt).toContain('2026')
    expect(image).not.toHaveAttribute('loading', 'lazy')
    expect(image).toHaveAttribute('fetchpriority', 'high')
    expect(image).toHaveAttribute('sizes')
    expect(image).toHaveAttribute('width', String(HERO_IMAGE.light.width))
    expect(image).toHaveAttribute('height', String(HERO_IMAGE.light.height))
  })

  it('keeps following the system colour scheme without an override', () => {
    mockSystemColorScheme('dark')
    renderWithSettings(<CalendarMockup />)

    expect(heroParts(document).source).toHaveAttribute('media', DARK_QUERY)
  })

  it('forces the dark image when the site is set to dark on a light system', () => {
    mockSystemColorScheme('light')
    storeColorScheme('dark')
    renderWithSettings(<CalendarMockup />)

    expect(heroParts(document).source).toHaveAttribute('media', 'all')
  })

  it('forces the light image when the site is set to light on a dark system', () => {
    mockSystemColorScheme('dark')
    storeColorScheme('light')
    renderWithSettings(<CalendarMockup />)

    expect(heroParts(document).source).toHaveAttribute('media', 'not all')
  })

  it('keeps the hero caption', () => {
    renderWithSettings(<CalendarMockup />)

    expect(
      screen.getByText('Your entire year of travels in one beautiful image')
    ).toBeInTheDocument()
  })
})
