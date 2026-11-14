import { describe, expect, it } from 'vitest'
import {
  CLIENT_DATA_COLLECTION,
  PRODUCTION_TRACES_SAMPLE_RATE,
  SERVER_DATA_COLLECTION,
  sentryEnvironment,
  tracesSampleRate,
} from './sentry'

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
})
