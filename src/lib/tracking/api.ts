import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export function validateSameOrigin(request: Request): NextResponse | null {
  const secFetchSite = request.headers.get('sec-fetch-site')
  if (secFetchSite !== 'same-origin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return null
}

export async function isAuthenticated() {
  const cookieStore = await cookies()
  return cookieStore.get('admin_session')?.value === 'authenticated'
}

export async function requireAdmin(
  request: Request
): Promise<NextResponse | null> {
  const forbidden = validateSameOrigin(request)
  if (forbidden) return forbidden

  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}
