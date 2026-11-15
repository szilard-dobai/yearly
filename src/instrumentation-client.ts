import {
  CLIENT_DATA_COLLECTION,
  SENTRY_DSN,
  scrubBreadcrumb,
  scrubSpan,
  sentryEnvironment,
  tracesSampleRate,
} from '@/lib/sentry'
import { isTrackingOptedOut } from '@/lib/tracking/opt-out'
import { installTranslationGuard } from '@/lib/translation-guard'
import { stripCheckoutToken } from '@/lib/videos/checkout-return'
import * as Sentry from '@sentry/nextjs'

stripCheckoutToken()
installTranslationGuard()

Sentry.init({
  dsn: SENTRY_DSN,
  environment: sentryEnvironment(),
  tracesSampler: () => (isTrackingOptedOut() ? 0 : tracesSampleRate()),
  dataCollection: CLIENT_DATA_COLLECTION,
  beforeBreadcrumb: scrubBreadcrumb,
  beforeSendSpan: scrubSpan,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
