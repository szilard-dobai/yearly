// @vitest-environment node
import type { Database } from '@/lib/db'
import { rateLimits, session, user, verification } from '@/lib/db/schema'
import { createTestDb } from '@/test/db'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  SESSION_CACHE_MINUTES,
  SESSION_DAYS,
  SIGN_IN_CODE_ATTEMPTS,
  createAuth,
  getAllowedHosts,
  getGoogleCredentials,
} from './config'
import type { SignUp } from './slack'

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
  let codes: string[]
  let signUps: SignUp[]
  let deletedUserIds: string[]
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
    codes = []
    signUps = []
    deletedUserIds = []
    auth = createAuth({
      db,
      secret: SECRET,
      sendSignInCode: async (_email, code) => {
        codes.push(code)
      },
      onSignUp: (signUp) => {
        signUps.push(signUp)
      },
      onUserDeleted: (userId) => {
        deletedUserIds.push(userId)
      },
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  function post(path: string, body: object, headers: object = HEADERS) {
    return auth.handler(
      new Request(`http://localhost:3000/api/auth${path}`, {
        method: 'POST',
        headers: { ...headers, 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
    )
  }

  async function requestCode(email: string) {
    const response = await post('/email-otp/send-verification-otp', {
      email,
      type: 'sign-in',
    })
    expect(response.status).toBe(200)
    return codes.at(-1)!
  }

  function signIn(email: string, otp: string) {
    return post('/sign-in/email-otp', { email, otp })
  }

  async function errorCode(response: Response) {
    return ((await response.json()) as { code?: string }).code
  }

  it('emails a 6-digit code that signs a new person in', async () => {
    const code = await requestCode('ana@example.com')
    expect(code).toMatch(/^\d{6}$/)

    const response = await signIn('ana@example.com', code)
    expect(response.status).toBe(200)

    const signedIn = await auth.api.getSession({
      headers: new Headers({ ...HEADERS, cookie: sessionCookie(response) }),
    })
    expect(signedIn?.user.email).toBe('ana@example.com')
    expect(signedIn?.user.emailVerified).toBe(true)
    const daysLeft =
      (new Date(signedIn!.session.expiresAt).getTime() - Date.now()) /
      (24 * 60 * 60 * 1000)
    expect(daysLeft).toBeGreaterThan(SESSION_DAYS - 1)
  })

  it('answers the signed-in check from a cookie for 5 minutes, without the database', async () => {
    const response = await signIn(
      'ana@example.com',
      await requestCode('ana@example.com')
    )
    const cache = response.headers
      .getSetCookie()
      .find((cookie) => cookie.includes('session_data='))
    expect(cache).toContain(`Max-Age=${SESSION_CACHE_MINUTES * 60}`)
    const headers = new Headers({ ...HEADERS, cookie: sessionCookie(response) })

    await db.delete(session)

    const cached = await auth.api.getSession({ headers })
    expect(cached?.user.email).toBe('ana@example.com')
    const checked = await auth.api.getSession({
      headers,
      query: { disableCookieCache: true },
    })
    expect(checked).toBeNull()
  })

  it('refuses a wrong code', async () => {
    await requestCode('ana@example.com')

    const response = await signIn('ana@example.com', '000000')
    expect(response.status).toBe(400)
    expect(await errorCode(response)).toBe('INVALID_OTP')
    expect(sessionCookie(response)).not.toContain('session_token=')
  })

  it('refuses even the right code after three wrong tries', async () => {
    const code = await requestCode('ana@example.com')
    const wrong = code === '000000' ? '111111' : '000000'
    for (let i = 0; i < SIGN_IN_CODE_ATTEMPTS; i++) {
      await signIn('ana@example.com', wrong)
    }

    const response = await signIn('ana@example.com', code)
    expect(response.ok).toBe(false)
    expect(await errorCode(response)).toBe('TOO_MANY_ATTEMPTS')
  })

  it('refuses a code the second time it is used', async () => {
    const code = await requestCode('ana@example.com')
    await signIn('ana@example.com', code)

    const second = await signIn('ana@example.com', code)
    expect(second.ok).toBe(false)
    expect(sessionCookie(second)).not.toContain('session_token=')
  })

  it('refuses an expired code', async () => {
    const code = await requestCode('ana@example.com')
    await db
      .update(verification)
      .set({ expiresAt: new Date(Date.now() - 1000) })

    const response = await signIn('ana@example.com', code)
    expect(response.ok).toBe(false)
    expect(await errorCode(response)).toBe('OTP_EXPIRED')
  })

  it('stores only a hash of the code', async () => {
    const code = await requestCode('ana@example.com')

    const rows = await db.select().from(verification)
    expect(rows).toHaveLength(1)
    expect(rows[0].value).not.toContain(code)
  })

  it('does not store the IP address on the session', async () => {
    await signIn('ana@example.com', await requestCode('ana@example.com'))

    const [row] = await db.select().from(session)
    expect(row.ipAddress).toBeNull()
    expect(row.userAgent).toBe('Vitest')
  })

  it('counts sign-in attempts but not the signed-in check every page makes', async () => {
    await db.delete(rateLimits)
    const context = await auth.$context
    context.rateLimit.enabled = true

    const check = await auth.handler(
      new Request('http://localhost:3000/api/auth/get-session', {
        headers: HEADERS,
      })
    )
    expect(check.status).toBe(200)
    expect(await db.select().from(rateLimits)).toHaveLength(0)

    await requestCode('ana@example.com')
    const rows = await db.select().from(rateLimits)
    expect(rows).toHaveLength(1)
    expect(rows[0].key).not.toContain('203.0.113.7')
  })

  it('signs a returning person into the same account', async () => {
    await signIn('ana@example.com', await requestCode('ana@example.com'))
    await signIn('ana@example.com', await requestCode('ana@example.com'))

    expect(await db.select().from(user)).toHaveLength(1)
    expect(await db.select().from(session)).toHaveLength(2)
  })

  it('reports a sign-up only the first time someone signs in', async () => {
    await signIn('ana@example.com', await requestCode('ana@example.com'))
    await signIn('ana@example.com', await requestCode('ana@example.com'))
    await post(
      '/sign-in/email-otp',
      { email: 'ben@example.com', otp: await requestCode('ben@example.com') },
      { ...HEADERS, 'x-vercel-ip-country': 'RO' }
    )

    expect(signUps).toEqual([
      { method: 'email', country: undefined },
      { method: 'email', country: 'RO' },
    ])
  })

  it('reports a Google sign-up as Google', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', 'google-client-id')
    vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-client-secret')
    auth = createAuth({
      db,
      secret: SECRET,
      sendSignInCode: async () => {},
      onSignUp: (signUp) => {
        signUps.push(signUp)
      },
    })
    const idToken = [
      { alg: 'none', typ: 'JWT' },
      {
        sub: 'google-user-1',
        email: 'ana@example.com',
        email_verified: true,
        name: 'Ana',
      },
    ]
      .map((part) => Buffer.from(JSON.stringify(part)).toString('base64url'))
      .concat('')
      .join('.')
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      Response.json({ access_token: 'access-token', id_token: idToken })
    )

    const start = await post('/sign-in/social', {
      provider: 'google',
      callbackURL: '/create',
    })
    const { url } = (await start.json()) as { url: string }
    const state = new URL(url).searchParams.get('state')
    const callback = await auth.handler(
      new Request(
        `http://localhost:3000/api/auth/callback/google?code=google-code&state=${state}`,
        {
          headers: {
            ...HEADERS,
            'x-vercel-ip-country': 'RO',
            cookie: sessionCookie(start),
          },
        }
      )
    )

    expect(callback.headers.get('location')).toBe('/create')
    expect(signUps).toEqual([{ method: 'google', country: 'RO' }])
  })

  it('does not report a sign-up when the code is wrong', async () => {
    await requestCode('ana@example.com')
    await signIn('ana@example.com', '000000')

    expect(signUps).toEqual([])
  })

  it('reports the ID of a deleted account so its activity can be unlinked', async () => {
    const response = await signIn(
      'ana@example.com',
      await requestCode('ana@example.com')
    )
    const [account] = await db.select().from(user)

    const deleted = await post(
      '/delete-user',
      {},
      { ...HEADERS, cookie: sessionCookie(response) }
    )

    expect(deleted.status).toBe(200)
    expect(await db.select().from(user)).toHaveLength(0)
    expect(deletedUserIds).toEqual([account.id])
  })

  it('rejects requests for hosts that are not allowed', async () => {
    await expect(
      post(
        '/email-otp/send-verification-otp',
        { email: 'ana@example.com', type: 'sign-in' },
        { ...HEADERS, host: 'evil.example', origin: 'http://evil.example' }
      )
    ).rejects.toThrow('not in the allowed hosts')
    expect(codes).toHaveLength(0)
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
