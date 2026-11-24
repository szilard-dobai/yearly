import { auth } from './server'

async function getSessionUser(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    return session?.user ?? null
  } catch (error) {
    console.error('Failed to check the session:', error)
    return null
  }
}

export async function getSessionEmail(
  request: Request
): Promise<string | null> {
  const user = await getSessionUser(request)
  return user?.email.trim().toLowerCase() ?? null
}

export async function getSessionUserId(
  request: Request
): Promise<string | null> {
  return (await getSessionUser(request))?.id ?? null
}
