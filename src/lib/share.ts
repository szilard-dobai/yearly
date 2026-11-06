export function buildShareUrl(siteUrl: string): string {
  const url = new URL(siteUrl)
  url.searchParams.set('utm_source', 'share')
  return url.toString()
}

export function buildShareText(siteUrl: string): string {
  return `Made with Yearly: ${buildShareUrl(siteUrl)}`
}
