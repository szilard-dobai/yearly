import type * as Sentry from '@sentry/nextjs'

type DataCollection = NonNullable<
  NonNullable<Parameters<typeof Sentry.init>[0]>['dataCollection']
>

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

export const PRODUCTION_TRACES_SAMPLE_RATE = 0.1

export function tracesSampleRate(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv === 'development' ? 1 : PRODUCTION_TRACES_SAMPLE_RATE
}

export function sentryEnvironment(
  vercelEnv = process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV,
  nodeEnv = process.env.NODE_ENV
) {
  return vercelEnv ?? nodeEnv ?? 'development'
}

export const SERVER_DATA_COLLECTION: DataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: false,
  httpBodies: [],
  urlQueryParams: false,
}

export const CLIENT_DATA_COLLECTION: DataCollection = {
  ...SERVER_DATA_COLLECTION,
  httpHeaders: { request: true, response: false },
}
