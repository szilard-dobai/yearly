import {
  CLIENT_DATA_COLLECTION,
  SENTRY_DSN,
  sentryEnvironment,
  tracesSampleRate,
} from '@/lib/sentry'
import { isTrackingOptedOut } from '@/lib/tracking/opt-out'
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: SENTRY_DSN,
  environment: sentryEnvironment(),
  tracesSampler: () => (isTrackingOptedOut() ? 0 : tracesSampleRate()),
  dataCollection: CLIENT_DATA_COLLECTION,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
