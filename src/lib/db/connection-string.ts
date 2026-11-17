export function withVerifyFullSsl(url: string | undefined) {
  return url?.replace(/([?&])sslmode=require(?=&|$)/, '$1sslmode=verify-full')
}
