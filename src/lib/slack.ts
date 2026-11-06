import { getCountryName } from '@/lib/admin/format'
import { getFlagEmoji } from '@/lib/countries'

const REQUEST_TIMEOUT_MS = 5000

export type SlackMessage = {
  text: string
  blocks: Record<string, unknown>[]
}

export function escapeSlackText(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function formatSlackLocation(country?: string, region?: string): string {
  if (!country) return 'Unknown location'
  const name = `${getFlagEmoji(country)} ${getCountryName(country)}`
  return region ? `${name} (${region})` : name
}

export function slackAdminLink(path: string, siteUrl?: string): string {
  return siteUrl
    ? ` · <${siteUrl.replace(/\/$/, '')}${path}|Open in admin>`
    : ''
}

export async function postSlackMessage(
  webhookUrl: string,
  message: SlackMessage,
  label: string
): Promise<void> {
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) {
      console.error(
        `Slack ${label} notification failed:`,
        response.status,
        await response.text()
      )
    }
  } catch (error) {
    console.error(`Slack ${label} notification failed:`, error)
  }
}
