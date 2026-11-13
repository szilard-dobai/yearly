export const DEFAULT_NEXT_PATH = '/account'

export function safeNextPath(value: string | string[] | undefined) {
  const path = Array.isArray(value) ? value[0] : value
  if (
    !path ||
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.includes('\\') ||
    path === '/sign-in' ||
    path.startsWith('/sign-in?') ||
    path.startsWith('/api/')
  ) {
    return DEFAULT_NEXT_PATH
  }
  return path
}
