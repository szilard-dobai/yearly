import { HERO_IMAGE, HOMEPAGE_EXAMPLES } from '@/lib/homepage-examples'
import { isAccountsEnabled } from '@/lib/auth/enabled'
import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
      images: [HERO_IMAGE, ...HOMEPAGE_EXAMPLES].flatMap(({ light, dark }) => [
        new URL(light.src, siteUrl).href,
        new URL(dark.src, siteUrl).href,
      ]),
    },
    {
      url: `${siteUrl}/create`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    ...(isAccountsEnabled()
      ? [
          {
            url: `${siteUrl}/terms`,
            lastModified: new Date(),
            changeFrequency: 'yearly' as const,
            priority: 0.3,
          },
        ]
      : []),
  ]
}
