const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!

interface JsonLdProps {
  type: 'website' | 'webapp'
}

export function JsonLd({ type }: JsonLdProps) {
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Yearly',
    url: siteUrl,
    description:
      'Create a stunning visual calendar of your travels. Add countries and dates, see flags replace days, and export a shareable image of your year in review.',
  }

  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Yearly',
    url: `${siteUrl}/create`,
    description:
      'Build your personalized travel calendar with country flags and export it as a shareable image.',
    applicationCategory: 'TravelApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'Visual calendar creation',
      'Country flag visualization',
      'Image export',
      'Social media sharing',
      'Dark mode support',
    ],
  }

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Yearly',
    url: siteUrl,
    logo: `${siteUrl}/icon-512.png`,
  }

  const schema = type === 'website' ? websiteSchema : webAppSchema

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
    </>
  )
}
