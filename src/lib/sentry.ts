import type * as Sentry from '@sentry/nextjs'

type InitOptions = NonNullable<Parameters<typeof Sentry.init>[0]>
type DataCollection = NonNullable<InitOptions['dataCollection']>
type SamplingContext = Parameters<NonNullable<InitOptions['tracesSampler']>>[0]
type Breadcrumb = Parameters<NonNullable<InitOptions['beforeBreadcrumb']>>[0]

export const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN

export const PRODUCTION_TRACES_SAMPLE_RATE = 0.1

export function tracesSampleRate(nodeEnv = process.env.NODE_ENV) {
  return nodeEnv === 'development' ? 1 : PRODUCTION_TRACES_SAMPLE_RATE
}

export const HEALTH_CHECK_PATH = '/api/health'

const HEALTH_CHECK_PATTERN = /\/api\/health(?:[/?#\s]|$)/

export function isHealthCheck({
  name,
  normalizedRequest,
  attributes,
}: Pick<SamplingContext, 'name' | 'normalizedRequest' | 'attributes'>) {
  return [
    name,
    normalizedRequest?.url,
    attributes?.['url.path'],
    attributes?.['http.target'],
    attributes?.['http.route'],
    attributes?.['next.route'],
  ].some(
    (value) => typeof value === 'string' && HEALTH_CHECK_PATTERN.test(value)
  )
}

export function serverTracesSampler(context: SamplingContext) {
  return isHealthCheck(context)
    ? 0
    : context.inheritOrSampleWith(tracesSampleRate())
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

const LABEL_ATTRIBUTES = /\[(?:aria-label|title|alt)="[^"]*"\]/g

function scrubLabels(text: string) {
  return text.replace(LABEL_ATTRIBUTES, '')
}

function scrubAttribute(value: unknown): unknown {
  if (typeof value === 'string') return scrubLabels(value)
  if (
    value &&
    typeof value === 'object' &&
    'value' in value &&
    typeof value.value === 'string'
  ) {
    return { ...value, value: scrubLabels(value.value) }
  }
  return value
}

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb {
  if (!breadcrumb.category?.startsWith('ui.') || !breadcrumb.message) {
    return breadcrumb
  }
  return { ...breadcrumb, message: scrubLabels(breadcrumb.message) }
}

export function scrubSpan<
  T extends { name: string; attributes: Record<string, unknown> },
>(span: T): T {
  return {
    ...span,
    name: scrubLabels(span.name),
    attributes: Object.fromEntries(
      Object.entries(span.attributes).map(([key, value]) => [
        key,
        scrubAttribute(value),
      ])
    ),
  }
}
