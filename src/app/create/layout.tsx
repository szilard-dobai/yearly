import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Create Your Travel Calendar',
  description:
    'Build your personalized travel calendar. Select countries, add visit dates, and create a beautiful visual summary of your travels to share on social media.',
  openGraph: {
    title: 'Create Your Travel Calendar | Yearly',
    description:
      'Build your personalized travel calendar with country flags and export it as a shareable image.',
  },
  alternates: {
    canonical: '/create',
  },
}

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
