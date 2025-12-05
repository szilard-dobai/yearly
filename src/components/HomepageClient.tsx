'use client'

import { trackEvent, type HomepageCtaClickMetadata } from '@/lib/tracking'
import { useEffect } from 'react'

export function useHomepageTracking() {
  useEffect(() => {
    trackEvent('homepage_view')
  }, [])
}

export function TrackingLink({
  href,
  linkType,
  className,
  children,
}: {
  href: string
  linkType: HomepageCtaClickMetadata['linkType']
  className?: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      onClick={() => trackEvent('homepage_cta_click', { linkType })}
      className={className}
    >
      {children}
    </a>
  )
}

export function HomepageTracker() {
  useHomepageTracking()
  return null
}
