import type { Metadata, ResolvingMetadata } from 'next'

export async function generateMetadata(
  _props: unknown,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { openGraph } = await parent

  const title = 'Make a Travel Calendar of the Countries You Visited'
  const shareTitle = `${title} | Yearly`
  const shareDescription =
    'Pick a country and dates, and its flag fills those days. Download the full year, one month or your stats as an image to share.'

  return {
    title,
    description:
      'Pick a country and dates, and its flag fills those days. Download the year, a month or your stats as a JPEG. Free, and your trip dates stay on your device.',
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: '/create',
      siteName: 'Yearly',
      title: shareTitle,
      description: shareDescription,
      images: openGraph?.images,
    },
    twitter: {
      card: 'summary_large_image',
      title: shareTitle,
      description: shareDescription,
    },
    alternates: {
      canonical: '/create',
    },
  }
}

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
