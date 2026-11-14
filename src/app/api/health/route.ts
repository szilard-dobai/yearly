import { missingSettings } from '@/lib/health'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const NO_STORE = { 'Cache-Control': 'no-store' }

export function GET() {
  const missing = missingSettings()
  if (missing.length > 0) {
    console.error(`Health check failed: ${missing.join(', ')} not set`)
    return NextResponse.json(
      { status: 'error' },
      { status: 503, headers: NO_STORE }
    )
  }
  return NextResponse.json({ status: 'ok' }, { headers: NO_STORE })
}
