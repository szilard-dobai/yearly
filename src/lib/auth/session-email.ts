import { isAccountsEnabled } from './enabled'
import { auth } from './server'

export async function getSessionEmail(
  request: Request
): Promise<string | null> {
  if (!isAccountsEnabled()) return null
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    return session?.user.email.trim().toLowerCase() ?? null
  } catch (error) {
    console.error('Failed to check the session:', error)
    return null
  }
}
