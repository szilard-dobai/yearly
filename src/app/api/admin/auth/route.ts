import {
  ADMIN_SESSION_COOKIE,
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createAdminSessionToken,
  isAdminPasswordConfigured,
  isValidAdminPassword,
} from '@/lib/admin/session'
import { isAuthenticated, validateSameOrigin } from '@/lib/tracking/api'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const forbidden = validateSameOrigin(request)
  if (forbidden) return forbidden

  return NextResponse.json({ authenticated: await isAuthenticated() })
}

export async function POST(request: Request) {
  const forbidden = validateSameOrigin(request)
  if (forbidden) return forbidden

  try {
    const { password } = await request.json()

    if (!isAdminPasswordConfigured()) {
      return NextResponse.json(
        { error: 'Admin password not configured' },
        { status: 500 }
      )
    }

    if (!isValidAdminPassword(password)) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    const cookieStore = await cookies()
    cookieStore.set(ADMIN_SESSION_COOKIE, createAdminSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Auth error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const forbidden = validateSameOrigin(request)
  if (forbidden) return forbidden

  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_SESSION_COOKIE)
  return NextResponse.json({ success: true })
}
