import { HERO_IMAGE, HOMEPAGE_EXAMPLES } from '@/lib/homepage-examples'
import { PAGE_UPDATED } from '@/lib/page-updated'
import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: PAGE_UPDATED.home,
      changeFrequency: 'monthly',
      priority: 1,
      images: [HERO_IMAGE, ...HOMEPAGE_EXAMPLES].flatMap(({ light, dark }) => [
        new URL(light.src, siteUrl).href,
        new URL(dark.src, siteUrl).href,
      ]),
    },
    {
      url: `${siteUrl}/create`,
      lastModified: PAGE_UPDATED.create,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/videos`,
      lastModified: PAGE_UPDATED.videos,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: PAGE_UPDATED.privacy,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      lastModified: PAGE_UPDATED.terms,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
