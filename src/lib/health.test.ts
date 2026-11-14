import { describe, expect, it } from 'vitest'
import { missingSettings } from './health'

const ACCOUNTS = {
  ACCOUNTS_ENABLED: 'true',
  NODE_ENV: 'production',
  MONGODB_URI: 'mongodb://example',
  DATABASE_URL: 'postgres://example',
  BETTER_AUTH_SECRET: 'secret',
  RESEND_API_KEY: 're_key',
}

describe('missingSettings', () => {
  it('needs only MongoDB while accounts are off', () => {
    expect(missingSettings({ MONGODB_URI: 'mongodb://example' })).toEqual([])
    expect(missingSettings({})).toEqual(['MONGODB_URI'])
  })

  it('needs the database, auth secret and email key once accounts are on', () => {
    expect(missingSettings(ACCOUNTS)).toEqual([])
    expect(
      missingSettings({
        ACCOUNTS_ENABLED: 'true',
        NODE_ENV: 'production',
        MONGODB_URI: 'mongodb://example',
      })
    ).toEqual(['DATABASE_URL', 'BETTER_AUTH_SECRET', 'RESEND_API_KEY'])
  })

  it('lets development run without an email key, since emails go to the console', () => {
    expect(
      missingSettings({
        ...ACCOUNTS,
        NODE_ENV: 'development',
        RESEND_API_KEY: undefined,
      })
    ).toEqual([])
  })

  it('treats a blank value as missing', () => {
    expect(missingSettings({ ...ACCOUNTS, BETTER_AUTH_SECRET: '  ' })).toEqual([
      'BETTER_AUTH_SECRET',
    ])
  })

  it('ignores account settings unless accounts are switched on exactly', () => {
    expect(
      missingSettings({ ACCOUNTS_ENABLED: 'yes', MONGODB_URI: 'mongodb://x' })
    ).toEqual([])
  })
})
