import { isAccountsEnabled } from '@/lib/auth/config'
import { auth } from '@/lib/auth/server'
import { calendarDaysSchema } from '@/lib/calendar-sync/days'
import { getCalendar, saveCalendar } from '@/lib/calendar-sync/store'
import { db } from '@/lib/db'
import { validateSameOrigin } from '@/lib/tracking/api'
import { NextResponse } from 'next/server'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const MAX_BODY_LENGTH = 512 * 1024
const NO_STORE = { 'Cache-Control': 'no-store' }

const saveSchema = z.object({
  days: calendarDaysSchema,
  baseVersion: z.number().int().min(0),
})

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE })
}

async function getUserId(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
    query: { disableCookieCache: true },
  })
  return session?.user.id ?? null
}

export async function GET(request: Request) {
  if (!isAccountsEnabled()) return new NextResponse(null, { status: 404 })

  const userId = await getUserId(request)
  if (!userId) return json({ error: 'Unauthorized' }, 401)

  return json(await getCalendar(db, userId))
}

export async function PUT(request: Request) {
  if (!isAccountsEnabled()) return new NextResponse(null, { status: 404 })

  const forbidden = validateSameOrigin(request)
  if (forbidden) return forbidden

  const userId = await getUserId(request)
  if (!userId) return json({ error: 'Unauthorized' }, 401)

  const text = await request.text()
  if (text.length > MAX_BODY_LENGTH) {
    return json({ error: 'Calendar too large' }, 413)
  }

  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const parsed = saveSchema.safeParse(body)
  if (!parsed.success) return json({ error: 'Invalid calendar' }, 400)

  const result = await saveCalendar(
    db,
    userId,
    parsed.data.days,
    parsed.data.baseVersion
  )
  return result.ok
    ? json({ version: result.version })
    : json(result.remote, 409)
}
