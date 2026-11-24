type Env = Record<string, string | undefined>

const REQUIRED = ['MONGODB_URI', 'DATABASE_URL', 'BETTER_AUTH_SECRET']
const REQUIRED_IN_PRODUCTION = ['RESEND_API_KEY']

export function missingSettings(env: Env = process.env) {
  const required =
    env.NODE_ENV === 'production'
      ? [...REQUIRED, ...REQUIRED_IN_PRODUCTION]
      : REQUIRED
  return required.filter((name) => !env[name]?.trim())
}
