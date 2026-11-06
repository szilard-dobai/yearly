import { afterEach, describe, expect, it, vi } from 'vitest'
import { HOMEPAGE_EXAMPLES } from '@/lib/homepage-examples'

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

  it('lists the example export images on the homepage entry', async () => {
    const entries = await loadSitemap('https://www.yearly.world')
    const homepage = entries.find(
      (entry) => entry.url === 'https://www.yearly.world'
    )

    expect(homepage?.images).toEqual([
      'https://www.yearly.world/examples/travel-calendar-2026-yearly.jpg',
      'https://www.yearly.world/examples/travel-calendar-june-2026-yearly.jpg',
      'https://www.yearly.world/examples/travel-stats-2026-yearly.jpg',
    ])
    expect(homepage?.images).toHaveLength(HOMEPAGE_EXAMPLES.length)
  })

  it('keeps image entries off the other pages', async () => {
    const entries = await loadSitemap('https://www.yearly.world')

    entries
      .filter((entry) => entry.url !== 'https://www.yearly.world')
      .forEach((entry) => expect(entry.images).toBeUndefined())
  })
})
