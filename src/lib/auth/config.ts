import type { Database } from '@/lib/db'
import * as schema from '@/lib/db/schema'
import { SIGN_IN_LINK_MINUTES } from '@/lib/email/sign-in-link'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { nextCookies } from 'better-auth/next-js'
import { magicLink } from 'better-auth/plugins/magic-link'
import { createRateLimitStorage } from './rate-limit'

export const SIGN_IN_LINK_RATE_LIMIT = { window: 10 * 60, max: 5 }

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
  sendSignInLink: (email: string, url: string) => Promise<void>
  secret?: string
}

export function createAuth({ db, sendSignInLink, secret }: CreateAuthOptions) {
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
      magicLink({
        expiresIn: SIGN_IN_LINK_MINUTES * 60,
        storeToken: 'hashed',
        rateLimit: SIGN_IN_LINK_RATE_LIMIT,
        sendMagicLink: ({ email, url }) => sendSignInLink(email, url),
      }),
      nextCookies(),
    ],
  })
}

export type Auth = ReturnType<typeof createAuth>
