import type { Database } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { SIGN_IN_CODE_MINUTES } from '@/lib/email/sign-in-code'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { emailOTP } from 'better-auth/plugins/email-otp'
import { createRateLimitStorage } from './rate-limit'

export const SIGN_IN_CODE_RATE_LIMIT = { window: 10 * 60, max: 5 }
export const SIGN_IN_CODE_ATTEMPTS = 3

export function isAccountsEnabled() {
  return process.env.ACCOUNTS_ENABLED === 'true'
}

function getSiteHost() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? '').host
  } catch {
    return undefined
  }
}

export function getAllowedHosts() {
  const hosts = [
    'yearly.world',
    'www.yearly.world',
    'localhost:3000',
    getSiteHost(),
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
  ].filter((host): host is string => Boolean(host))
  return [...new Set(hosts)]
}

export function getGoogleCredentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  return clientId && clientSecret ? { clientId, clientSecret } : null
}

interface CreateAuthOptions {
  db: Database
  sendSignInCode: (email: string, code: string) => Promise<void>
  secret?: string
}

export function createAuth({ db, sendSignInCode, secret }: CreateAuthOptions) {
  const google = getGoogleCredentials()

  return betterAuth({
    appName: 'Yearly',
    secret,
    baseURL: { allowedHosts: getAllowedHosts() },
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    socialProviders: google
      ? { google: { ...google, prompt: 'select_account' } }
      : undefined,
    rateLimit: { customStorage: createRateLimitStorage(db) },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => ({
            data: { ...session, ipAddress: null },
          }),
        },
      },
    },
    plugins: [
      emailOTP({
        otpLength: 6,
        expiresIn: SIGN_IN_CODE_MINUTES * 60,
        allowedAttempts: SIGN_IN_CODE_ATTEMPTS,
        storeOTP: 'hashed',
        rateLimit: SIGN_IN_CODE_RATE_LIMIT,
        sendVerificationOTP: ({ email, otp }) => sendSignInCode(email, otp),
      }),
      nextCookies(),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>
