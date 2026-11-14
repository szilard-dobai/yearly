import {
  SENTRY_DSN,
  SERVER_DATA_COLLECTION,
  sentryEnvironment,
  serverTracesSampler,
} from '@/lib/sentry'
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: SENTRY_DSN,
  environment: sentryEnvironment(),
  tracesSampler: serverTracesSampler,
  dataCollection: SERVER_DATA_COLLECTION,
  integrations: [Sentry.captureConsoleIntegration({ levels: ['error'] })],
})
