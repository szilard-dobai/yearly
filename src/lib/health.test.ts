import { describe, expect, it } from 'vitest'
import { missingSettings } from './health'

const ALL = {
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb://example',
  DATABASE_URL: 'postgres://example',
  BETTER_AUTH_SECRET: 'secret',
  RESEND_API_KEY: 're_key',
}

describe('missingSettings', () => {
  it('needs MongoDB, the database, auth secret and email key', () => {
    expect(missingSettings(ALL)).toEqual([])
    expect(missingSettings({ NODE_ENV: 'production' })).toEqual([
      'MONGODB_URI',
      'DATABASE_URL',
      'BETTER_AUTH_SECRET',
      'RESEND_API_KEY',
    ])
  })

  it('lets development run without an email key, since emails go to the console', () => {
    expect(
      missingSettings({
        ...ALL,
        NODE_ENV: 'development',
        RESEND_API_KEY: undefined,
      })
    ).toEqual([])
  })

  it('treats a blank value as missing', () => {
    expect(missingSettings({ ...ALL, BETTER_AUTH_SECRET: '  ' })).toEqual([
      'BETTER_AUTH_SECRET',
    ])
  })
})
