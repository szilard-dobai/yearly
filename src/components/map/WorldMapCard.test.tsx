import { trackEvent } from '@/lib/tracking'
import type { CountryVisit } from '@/lib/types'
import { FLAT_FLAG_FILES } from '@/lib/emoji-images'
import { loadWorld } from '@/lib/world-map'
import {
  fireEvent,
  renderWithSettings,
  screen,
  waitFor,
} from '@/test/test-utils'
import userEvent from '@testing-library/user-event'
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import MapTeaser from './MapTeaser'
import WorldMapCard from './WorldMapCard'

vi.mock('@/lib/tracking', () => ({
  trackEvent: vi.fn(),
  getDeviceType: () => 'desktop',
}))

let reportIntersection: (isIntersecting: boolean) => void = () => {}

class MockIntersectionObserver {
  constructor(callback: IntersectionObserverCallback) {
    reportIntersection = (isIntersecting) =>
      callback(
        [{ isIntersecting } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver
      )
  }
  observe() {}
  disconnect() {}
}

function day(countryCode: string, date: Date): CountryVisit {
  return { id: `${countryCode}-${date.getTime()}`, countryCode, date }
}

const visits = [
  day('GR', new Date(2025, 7, 10)),
  day('FR', new Date(2026, 5, 18)),
  day('FR', new Date(2026, 5, 19)),
  day('IT', new Date(2026, 5, 20)),
  day('JP', new Date(2026, 1, 14)),
  day('SG', new Date(2026, 1, 16)),
]

function statValue(label: string) {
  return screen.getByText(label).nextElementSibling?.textContent
}

async function renderLoadedCard() {
  const view = renderWithSettings(
    <WorldMapCard calendarData={{ visits }} year={2026} />
  )
  reportIntersection(true)
  const map = await screen.findByRole(
    'img',
    { name: /countries filled in/ },
    { timeout: 5000 }
  )
  return { ...view, map }
}

describe('WorldMapCard', () => {
  beforeAll(() => loadWorld(), 30000)

  beforeEach(() => {
    vi.mocked(trackEvent).mockClear()
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('loads the map only once the card is near the screen', async () => {
    renderWithSettings(<WorldMapCard calendarData={{ visits }} year={2026} />)

    expect(
      screen.getByRole('status', { name: 'Loading the map' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('img', { name: /countries filled in/ })
    ).not.toBeInTheDocument()

    reportIntersection(true)

    expect(
      await screen.findByRole(
        'img',
        { name: 'World map with 4 countries filled in' },
        { timeout: 5000 }
      )
    ).toBeInTheDocument()
  })

  it('counts the selected year and switches to all time', async () => {
    const { map } = await renderLoadedCard()

    expect(map).toHaveAccessibleName('World map with 4 countries filled in')
    expect(statValue('Countries')).toBe('4')
    expect(statValue('Continents')).toBe('2/7')

    await userEvent.click(screen.getByRole('radio', { name: 'All time' }))

    expect(statValue('Countries')).toBe('5')
    expect(
      screen.getByRole('img', { name: /5 countries filled in/ })
    ).toBeInTheDocument()
    expect(trackEvent).toHaveBeenCalledWith('map_view_change', {
      change: 'scope',
      value: 'all',
      source: 'create',
    })
  })

  it('fills countries with their flat flags, or shades them by days', async () => {
    const { container } = await renderLoadedCard()

    const flagSources = [...container.querySelectorAll('pattern image')].map(
      (image) => image.getAttribute('href')
    )
    expect(flagSources).toContain(
      `/emoji/flags/flat/${FLAT_FLAG_FILES.FR}.webp`
    )
    expect(container.querySelector('circle')).not.toBeNull()

    await userEvent.click(screen.getByRole('radio', { name: 'By days' }))

    expect(container.querySelector('pattern')).toBeNull()
    expect(screen.getByText('Days spent')).toBeInTheDocument()
    expect(screen.getByText('15+')).toBeInTheDocument()
  })

  it('zooms to a visited continent and disables the others', async () => {
    const { map } = await renderLoadedCard()
    const svg = map as unknown as SVGSVGElement
    const worldBox = svg.getAttribute('viewBox')

    expect(screen.getByRole('button', { name: /Africa/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'World' })).toHaveAttribute(
      'aria-pressed',
      'true'
    )

    await userEvent.click(screen.getByRole('button', { name: 'Europe 2' }))

    expect(svg.getAttribute('viewBox')).not.toBe(worldBox)
    expect(trackEvent).toHaveBeenCalledWith('map_view_change', {
      change: 'zoom',
      value: 'EU',
      source: 'create',
    })

    await userEvent.click(screen.getByRole('button', { name: 'World' }))

    expect(svg.getAttribute('viewBox')).toBe(worldBox)
  })

  it('names a country and its days when tapped', async () => {
    const { container } = await renderLoadedCard()
    const singapore = container.querySelector('circle')!

    fireEvent.pointerDown(singapore, { clientX: 10, clientY: 10 })

    expect(screen.getByText('Singapore')).toBeInTheDocument()
    expect(screen.getByText('1 day')).toBeInTheDocument()
  })

  it('says when the selected year has no trips', async () => {
    renderWithSettings(<WorldMapCard calendarData={{ visits }} year={2027} />)

    expect(screen.getByText('No trips in 2027 yet.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Download map as JPEG image' })
    ).toBeDisabled()

    await userEvent.click(screen.getByRole('radio', { name: 'All time' }))

    await waitFor(() => expect(statValue('Countries')).toBe('5'))
  })
})

describe('MapTeaser', () => {
  beforeEach(() => {
    vi.mocked(trackEvent).mockClear()
  })

  it('sends signed-out visitors to sign in and back to the create page', async () => {
    renderWithSettings(<MapTeaser countryCount={5} />)

    expect(
      screen.getByText(
        'See your 5 countries on a world map, each one filled with its flag.'
      )
    ).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'Sign in to see your map' })
    expect(link).toHaveAttribute('href', '/sign-in?next=/create')

    await userEvent.click(link)

    expect(trackEvent).toHaveBeenCalledWith('map_teaser_click', {
      countryCount: 5,
    })
  })
})
