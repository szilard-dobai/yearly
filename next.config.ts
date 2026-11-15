import { withSentryConfig } from '@sentry/nextjs/config'
import type { NextConfig } from 'next'
import { withWorkflow } from 'workflow/next'

const IMMUTABLE = [
  { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
]
const PLAIN_TEXT = [{ key: 'Content-Type', value: 'text/plain; charset=utf-8' }]

const nextConfig: NextConfig = {
  serverExternalPackages: ['@polar-sh/sdk'],
  async headers() {
    return [
      { source: '/emoji/flags/:path*', headers: IMMUTABLE },
      { source: '/emoji/small/:path*', headers: IMMUTABLE },
      { source: '/emoji/large/:path*', headers: IMMUTABLE },
      { source: '/emoji/LICENSE', headers: PLAIN_TEXT },
      { source: '/emoji/README.md', headers: PLAIN_TEXT },
    ]
  },
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
}

export default withSentryConfig(withWorkflow(nextConfig), {
  org: 'szilard-dobai',
  project: 'yearly',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  _experimental: { vercelCronsMonitoring: true },
})
