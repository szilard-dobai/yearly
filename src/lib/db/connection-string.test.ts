import { describe, expect, it } from 'vitest'
import { withVerifyFullSsl } from './connection-string'

const HOST = 'postgres://user:pass@ep-example.eu-central-1.aws.neon.tech/db'

describe('withVerifyFullSsl', () => {
  it('turns the sslmode=require that Neon hands out into verify-full', () => {
    expect(withVerifyFullSsl(`${HOST}?sslmode=require`)).toBe(
      `${HOST}?sslmode=verify-full`
    )
  })

  it('keeps the other query parameters as they were', () => {
    expect(
      withVerifyFullSsl(`${HOST}?sslmode=require&channel_binding=require`)
    ).toBe(`${HOST}?sslmode=verify-full&channel_binding=require`)
    expect(
      withVerifyFullSsl(`${HOST}?channel_binding=require&sslmode=require`)
    ).toBe(`${HOST}?channel_binding=require&sslmode=verify-full`)
  })

  it('leaves every other sslmode alone', () => {
    for (const mode of ['verify-full', 'disable', 'no-verify', 'prefer']) {
      expect(withVerifyFullSsl(`${HOST}?sslmode=${mode}`)).toBe(
        `${HOST}?sslmode=${mode}`
      )
    }
    expect(withVerifyFullSsl(`${HOST}?sslmode=required`)).toBe(
      `${HOST}?sslmode=required`
    )
  })

  it('leaves a URL without an sslmode alone', () => {
    expect(withVerifyFullSsl(HOST)).toBe(HOST)
    expect(withVerifyFullSsl(undefined)).toBeUndefined()
  })
})
