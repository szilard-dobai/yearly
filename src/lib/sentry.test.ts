import { describe, expect, it, vi } from 'vitest'
import {
  CLIENT_DATA_COLLECTION,
  PRODUCTION_TRACES_SAMPLE_RATE,
  SERVER_DATA_COLLECTION,
  isHealthCheck,
  sentryEnvironment,
  serverTracesSampler,
  tracesSampleRate,
} from './sentry'

function samplingContext(path: string) {
  return {
    name: 'GET',
    normalizedRequest: { url: `https://www.yearly.world${path}` },
    attributes: { 'http.method': 'GET', 'http.target': path },
    inheritOrSampleWith: vi.fn((rate: number) => rate),
  }
}

describe('Sentry options', () => {
  it('samples every trace locally and 10% elsewhere', () => {
    expect(tracesSampleRate('development')).toBe(1)
    expect(tracesSampleRate('production')).toBe(PRODUCTION_TRACES_SAMPLE_RATE)
    expect(PRODUCTION_TRACES_SAMPLE_RATE).toBe(0.1)
  })

  it('names the environment after the Vercel deployment', () => {
    expect(sentryEnvironment('production', 'production')).toBe('production')
    expect(sentryEnvironment('preview', 'production')).toBe('preview')
    expect(sentryEnvironment(undefined, 'development')).toBe('development')
  })

  it('never sends user details, cookies, bodies or query values', () => {
    for (const collection of [SERVER_DATA_COLLECTION, CLIENT_DATA_COLLECTION]) {
      expect(collection).toMatchObject({
        userInfo: false,
        cookies: false,
        httpBodies: [],
        urlQueryParams: false,
      })
    }
  })

  it('keeps server request headers out, since they carry the IP address', () => {
    expect(SERVER_DATA_COLLECTION.httpHeaders).toBe(false)
    expect(CLIENT_DATA_COLLECTION.httpHeaders).toEqual({
      request: true,
      response: false,
    })
  })

  it('recognises health checks by their path, since server spans are named after the method', () => {
    expect(isHealthCheck(samplingContext('/api/health'))).toBe(true)
    expect(isHealthCheck(samplingContext('/api/health?probe=1'))).toBe(true)
    expect(isHealthCheck({ name: 'GET /api/health', attributes: {} })).toBe(
      true
    )
    expect(isHealthCheck(samplingContext('/api/healthy'))).toBe(false)
    expect(isHealthCheck(samplingContext('/api/feedback'))).toBe(false)
    expect(isHealthCheck({ name: 'GET', attributes: {} })).toBe(false)
  })

  it('never traces health checks and samples everything else as before', () => {
    const health = samplingContext('/api/health')
    expect(serverTracesSampler(health)).toBe(0)
    expect(health.inheritOrSampleWith).not.toHaveBeenCalled()

    const sync = samplingContext('/api/calendar')
    expect(serverTracesSampler(sync)).toBe(tracesSampleRate())
    expect(sync.inheritOrSampleWith).toHaveBeenCalledWith(tracesSampleRate())
  })
})
