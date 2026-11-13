// @vitest-environment node
import type { Database } from '@/lib/db'
import { session, user, verification } from '@/lib/db/schema'
import { createTestDb } from '@/test/db'
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { createAuth, getAllowedHosts, getGoogleCredentials } from './config'

const SECRET = 'test-secret-that-is-at-least-32-characters'
const HEADERS = {
  host: 'localhost:3000',
  origin: 'http://localhost:3000',
  'x-forwarded-for': '203.0.113.7',
  'user-agent': 'Vitest',
}

function sessionCookie(response: Response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ')
}

describe('createAuth', () => {
  let db: Database
  let close: () => Promise<void>
  let links: string[]
  let auth: ReturnType<typeof createAuth>

  beforeAll(async () => {
    ;({ db, close } = await createTestDb())
  })

  afterAll(async () => {
    await close()
  })

  beforeEach(async () => {
    await db.delete(session)
    await db.delete(verification)
    await db.delete(user)
    links = []
    auth = createAuth({
      db,
      secret: SECRET,
      sendSignInLink: async (_email, url) => {
        links.push(url)
      },
    })
  })

  async function requestLink(email: string) {
    await auth.api.signInMagicLink({
      body: { email, callbackURL: '/account', errorCallbackURL: '/account' },
      headers: new Headers(HEADERS),
    })
    return new URL(links.at(-1)!)
  }

  it('emails a one-time link that signs a new person in', async () => {
    const link = await requestLink('ana@example.com')

    expect(link.origin).toBe('http://localhost:3000')
    expect(link.pathname).toBe('/api/auth/magic-link/verify')

    const response = await auth.handler(new Request(link, { headers: HEADERS }))
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/account'
    )

    const signedIn = await auth.api.getSession({
      headers: new Headers({ ...HEADERS, cookie: sessionCookie(response) }),
    })
    expect(signedIn?.user.email).toBe('ana@example.com')
    expect(signedIn?.user.emailVerified).toBe(true)
  })

  it('refuses a link the second time it is used', async () => {
    const link = await requestLink('ana@example.com')
    await auth.handler(new Request(link, { headers: HEADERS }))

    const second = await auth.handler(new Request(link, { headers: HEADERS }))
    expect(second.headers.get('location')).toBe(
      'http://localhost:3000/account?error=INVALID_TOKEN'
    )
    expect(sessionCookie(second)).not.toContain('session_token=')
  })

  it('stores only a hash of the link token', async () => {
    const link = await requestLink('ana@example.com')
    const token = link.searchParams.get('token')!

    const rows = await db.select().from(verification)
    expect(rows).toHaveLength(1)
    expect(rows[0].identifier).not.toBe(token)
    expect(JSON.stringify(rows[0])).not.toContain(token)
  })

  it('does not store the IP address on the session', async () => {
    const link = await requestLink('ana@example.com')
    await auth.handler(new Request(link, { headers: HEADERS }))

    const [row] = await db.select().from(session)
    expect(row.ipAddress).toBeNull()
    expect(row.userAgent).toBe('Vitest')
  })

  it('signs a returning person into the same account', async () => {
    await auth.handler(
      new Request(await requestLink('ana@example.com'), { headers: HEADERS })
    )
    await auth.handler(
      new Request(await requestLink('ana@example.com'), { headers: HEADERS })
    )

    expect(await db.select().from(user)).toHaveLength(1)
  })

  it('rejects links for hosts that are not allowed', async () => {
    await expect(
      auth.api.signInMagicLink({
        body: { email: 'ana@example.com', callbackURL: '/account' },
        headers: new Headers({ ...HEADERS, host: 'evil.example' }),
      })
    ).rejects.toThrow()
    expect(links).toHaveLength(0)
  })
})

describe('getAllowedHosts', () => {
  it('adds the Vercel deployment and branch hosts when they are set', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    vi.stubEnv('VERCEL_URL', 'yearly-abc123-team.vercel.app')
    vi.stubEnv('VERCEL_BRANCH_URL', 'yearly-git-accounts-team.vercel.app')

    expect(getAllowedHosts()).toEqual([
      'yearly.world',
      'www.yearly.world',
      'localhost:3000',
      'yearly-abc123-team.vercel.app',
      'yearly-git-accounts-team.vercel.app',
    ])
    vi.unstubAllEnvs()
  })

  it('adds the host of the site URL, such as a local port', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'http://localhost:3030')
    vi.stubEnv('VERCEL_URL', '')
    vi.stubEnv('VERCEL_BRANCH_URL', '')

    expect(getAllowedHosts()).toEqual([
      'yearly.world',
      'www.yearly.world',
      'localhost:3000',
      'localhost:3030',
    ])
    vi.unstubAllEnvs()
  })

  it('lists each host once and ignores a missing site URL', () => {
    vi.stubEnv('VERCEL_URL', '')
    vi.stubEnv('VERCEL_BRANCH_URL', '')

    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.yearly.world')
    expect(getAllowedHosts()).toEqual([
      'yearly.world',
      'www.yearly.world',
      'localhost:3000',
    ])

    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '')
    expect(getAllowedHosts()).toEqual([
      'yearly.world',
      'www.yearly.world',
      'localhost:3000',
    ])
    vi.unstubAllEnvs()
  })

  it('does not allow every vercel.app host', () => {
    vi.stubEnv('VERCEL_URL', '')
    vi.stubEnv('VERCEL_BRANCH_URL', '')

    expect(getAllowedHosts()).not.toContainEqual(expect.stringContaining('*'))
    vi.unstubAllEnvs()
  })
})

describe('getGoogleCredentials', () => {
  it('returns null unless both the client ID and secret are set', () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'id')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', '')
    expect(getGoogleCredentials()).toBeNull()

    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'secret')
    expect(getGoogleCredentials()).toEqual({
      clientId: 'id',
      clientSecret: 'secret',
    })
    vi.unstubAllEnvs()
  })
})
