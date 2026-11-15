export function isAccountsEnabled() {
  return process.env.ACCOUNTS_ENABLED === 'true'
}

export function isGoogleSignInConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  )
}
