import { afterEach, describe, expect, it, vi } from 'vitest'
import { HOMEPAGE_EXAMPLES } from '@/lib/homepage-examples'
import { PAGE_UPDATED } from '@/lib/page-updated'

async function loadSitemap(siteUrl: string) {
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', siteUrl)
  vi.resetModules()
  const { default: sitemap } = await import('./sitemap')
  return sitemap()
}

describe('sitemap', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('lists the light and dark hero and example images on the homepage entry', async () => {
    const entries = await loadSitemap('https://www.yearly.world')
    const homepage = entries.find(
      (entry) => entry.url === 'https://www.yearly.world'
    )

    expect(homepage?.images).toEqual([
      'https://www.yearly.world/example_light.jpg',
      'https://www.yearly.world/example_dark.jpg',
      'https://www.yearly.world/examples/travel-calendar-2026-yearly.jpg',
      'https://www.yearly.world/examples/travel-calendar-2026-yearly-dark.jpg',
      'https://www.yearly.world/examples/travel-calendar-june-2026-yearly.jpg',
      'https://www.yearly.world/examples/travel-calendar-june-2026-yearly-dark.jpg',
      'https://www.yearly.world/examples/travel-stats-2026-yearly.jpg',
      'https://www.yearly.world/examples/travel-stats-2026-yearly-dark.jpg',
    ])
    expect(homepage?.images).toHaveLength((HOMEPAGE_EXAMPLES.length + 1) * 2)
  })

  it('lists the videos page', async () => {
    const entries = await loadSitemap('https://www.yearly.world')

    expect(entries.map((entry) => entry.url)).toContain(
      'https://www.yearly.world/videos'
    )
  })

  it('gives every page a fixed date from PAGE_UPDATED, not the time of the request', async () => {
    const entries = await loadSitemap('https://www.yearly.world')

    expect(entries.map((entry) => entry.lastModified)).toEqual([
      PAGE_UPDATED.home,
      PAGE_UPDATED.create,
      PAGE_UPDATED.videos,
      PAGE_UPDATED.privacy,
      PAGE_UPDATED.terms,
    ])
  })

  it('never dates a page in the future', () => {
    const today = new Date().toISOString().slice(0, 10)

    Object.values(PAGE_UPDATED).forEach((day) => {
      expect(day).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(day <= today).toBe(true)
    })
  })

  it('keeps image entries off the other pages', async () => {
    const entries = await loadSitemap('https://www.yearly.world')

    entries
      .filter((entry) => entry.url !== 'https://www.yearly.world')
      .forEach((entry) => expect(entry.images).toBeUndefined())
  })
})
