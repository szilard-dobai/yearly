type Env = Record<string, string | undefined>

const REQUIRED = ['MONGODB_URI']
const REQUIRED_FOR_ACCOUNTS = ['DATABASE_URL', 'BETTER_AUTH_SECRET']
const REQUIRED_FOR_ACCOUNTS_IN_PRODUCTION = ['RESEND_API_KEY']

export function missingSettings(env: Env = process.env) {
  const required = [...REQUIRED]
  if (env.ACCOUNTS_ENABLED === 'true') {
    required.push(...REQUIRED_FOR_ACCOUNTS)
    if (env.NODE_ENV === 'production') {
      required.push(...REQUIRED_FOR_ACCOUNTS_IN_PRODUCTION)
    }
  }
  return required.filter((name) => !env[name]?.trim())
}
