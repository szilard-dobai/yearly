import { auth } from '@/lib/auth/server'
import { NextResponse } from 'next/server'

const NO_STORE = { 'Cache-Control': 'no-store' }

export const MAX_VIDEO_BODY_LENGTH = 64 * 1024

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE })
}

export function notFound() {
  return new NextResponse(null, { status: 404 })
}

export async function getVideoUser(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  })
  if (!session) return null
  const { id, email, emailVerified } = session.user
  return { id, email, emailVerified }
}

export async function readJson(
  request: Request
): Promise<{ ok: true; body: unknown } | { ok: false; response: Response }> {
  const text = await request.text()
  if (text.length > MAX_VIDEO_BODY_LENGTH) {
    return { ok: false, response: json({ error: 'Too large' }, 413) }
  }
  try {
    return { ok: true, body: JSON.parse(text) }
  } catch {
    return { ok: false, response: json({ error: 'Invalid JSON' }, 400) }
  }
}

export function clientIp(request: Request): string | undefined {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined
  )
}
