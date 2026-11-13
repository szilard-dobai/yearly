import { isAccountsEnabled } from '@/lib/auth/config'
import { auth } from '@/lib/auth/server'
import { toNextJsHandler } from 'better-auth/next-js'

const handlers = toNextJsHandler(auth)

function notFound() {
  return new Response(null, { status: 404 })
}

export function GET(request: Request) {
  return isAccountsEnabled() ? handlers.GET(request) : notFound()
}

export function POST(request: Request) {
  return isAccountsEnabled() ? handlers.POST(request) : notFound()
}
