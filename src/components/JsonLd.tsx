import { faqs } from '@/lib/faq'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!

interface JsonLdProps {
  type: 'website' | 'faq'
}

const organizationId = `${siteUrl}/#organization`

const websiteSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': organizationId,
      name: 'Yearly',
      url: siteUrl,
      logo: `${siteUrl}/web-app-manifest-512x512.png`,
      sameAs: ['https://www.instagram.com/yearly.world'],
    },
    {
      '@type': 'WebSite',
      '@id': `${siteUrl}/#website`,
      name: 'Yearly',
      alternateName: 'yearly.world',
      url: siteUrl,
      description:
        'Make a travel calendar of the countries you visited, with a flag on every day you were away, and download your year in review as an image.',
      inLanguage: 'en',
      publisher: { '@id': organizationId },
    },
  ],
}

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': `${siteUrl}/#faq`,
  mainEntity: faqs.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
}

export function JsonLd({ type }: JsonLdProps) {
  const schema = type === 'website' ? websiteSchema : faqSchema

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
      }}
    />
  )
}
