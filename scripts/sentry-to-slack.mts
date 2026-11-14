/**
 * Posts new, returning and spiking production errors from Sentry to Slack.
 *
 * Sentry's free plan only sends alerts by email, so the scheduled workflow in
 * .github/workflows/sentry-slack.yml runs this every 15 minutes instead. It
 * remembers each open issue's status in a small state file, which the
 * workflow keeps in the Actions cache, and posts one Slack message per run
 * when something changed. Needs no npm install: Node 24 runs it directly.
 *
 * Usage:
 *   node scripts/sentry-to-slack.mts
 *
 * Environment variables:
 *   - SENTRY_READ_TOKEN: a Sentry user auth token with event:read
 *   - SLACK_ALERTS_WEBHOOK_URL: a Slack incoming webhook for the alerts channel
 *   - SENTRY_SLACK_STATE_FILE (optional): defaults to .sentry-slack-state.json
 */

import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const SENTRY_API = 'https://de.sentry.io/api/0'
const SENTRY_ORG_URL = 'https://szilard-dobai.sentry.io'
const ORG = 'szilard-dobai'
const PROJECT_ID = '4512429510492240'
const ENVIRONMENT = 'production'
const LOOKBACK_MS = 60 * 60 * 1000
const MAX_ALERTS_PER_MESSAGE = 10

export type AlertKind = 'new' | 'regressed' | 'escalating'

export type SentryIssue = {
  id: string
  shortId: string
  title: string
  culprit: string
  substatus: string
  firstSeen: string
  lastSeen: string
  count: number
}

export type BridgeState = {
  checkedAt: string
  issues: Record<string, string>
}

export type Alert = { kind: AlertKind; issue: SentryIssue }

export type SlackMessage = {
  text: string
  unfurl_links: false
  unfurl_media: false
}

export type BridgeDeps = {
  fetch: typeof fetch
  token: string
  webhookUrl: string
  now: Date
  readState: () => Promise<BridgeState | null>
  writeState: (state: BridgeState) => Promise<void>
}

const HEADINGS: Record<AlertKind, string> = {
  new: ':rotating_light: *New error in production*',
  regressed: ':repeat: *Resolved error is back in production*',
  escalating: ':chart_with_upwards_trend: *Error is spiking in production*',
}

function isAlertKind(value: string): value is 'regressed' | 'escalating' {
  return value === 'regressed' || value === 'escalating'
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value))
}

function asText(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function asCount(value: unknown) {
  const count = Number(value)
  return Number.isFinite(count) && count >= 0 ? count : 0
}

export function issuesUrl() {
  const params = new URLSearchParams({
    project: PROJECT_ID,
    environment: ENVIRONMENT,
    query: 'is:unresolved',
    sort: 'date',
    statsPeriod: '14d',
    limit: '100',
  })
  return `${SENTRY_API}/organizations/${ORG}/issues/?${params}`
}

export function issueUrl(id: string) {
  return `${SENTRY_ORG_URL}/issues/${id}/?environment=${ENVIRONMENT}`
}

export function parseIssues(data: unknown): SentryIssue[] {
  if (!Array.isArray(data)) {
    throw new Error('Sentry did not return a list of issues')
  }
  return data.flatMap((item: unknown) => {
    if (typeof item !== 'object' || item === null) return []
    const raw = item as Record<string, unknown>
    if (typeof raw.id !== 'string' || !/^\d+$/.test(raw.id)) return []
    if (!isTimestamp(raw.firstSeen) || !isTimestamp(raw.lastSeen)) return []
    return [
      {
        id: raw.id,
        shortId: asText(raw.shortId),
        title: asText(raw.title),
        culprit: asText(raw.culprit),
        substatus: asText(raw.substatus),
        firstSeen: raw.firstSeen,
        lastSeen: raw.lastSeen,
        count: asCount(raw.count),
      },
    ]
  })
}

export function parseState(raw: string): BridgeState | null {
  try {
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null) return null
    const { checkedAt, issues } = data as Record<string, unknown>
    if (!isTimestamp(checkedAt)) return null
    if (typeof issues !== 'object' || issues === null) return null
    return {
      checkedAt,
      issues: Object.fromEntries(
        Object.entries(issues).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string'
        )
      ),
    }
  } catch {
    return null
  }
}

export function pickAlerts(
  issues: SentryIssue[],
  state: BridgeState | null,
  now: Date
): Alert[] {
  const since =
    (state ? Date.parse(state.checkedAt) : now.getTime()) - LOOKBACK_MS
  return issues.flatMap((issue): Alert[] => {
    const previous = state?.issues[issue.id]
    if (previous === undefined) {
      if (Date.parse(issue.firstSeen) >= since) return [{ kind: 'new', issue }]
      if (isAlertKind(issue.substatus) && Date.parse(issue.lastSeen) >= since) {
        return [{ kind: issue.substatus, issue }]
      }
      return []
    }
    if (isAlertKind(issue.substatus) && previous !== issue.substatus) {
      return [{ kind: issue.substatus, issue }]
    }
    return []
  })
}

export function nextState(issues: SentryIssue[], now: Date): BridgeState {
  return {
    checkedAt: now.toISOString(),
    issues: Object.fromEntries(
      issues.map((issue) => [issue.id, issue.substatus])
    ),
  }
}

export function escapeSlack(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

function describeAlert({ kind, issue }: Alert) {
  const label = escapeSlack(issue.shortId || `Issue ${issue.id}`)
  const title = escapeSlack(truncate(issue.title || 'Untitled error', 200))
  const details = [plural(issue.count, 'event')]
  if (issue.culprit) {
    const culprit = truncate(issue.culprit.replace(/`/g, "'"), 120)
    details.unshift(`\`${escapeSlack(culprit)}\``)
  }
  return [
    HEADINGS[kind],
    `<${issueUrl(issue.id)}|${label}> ${title}`,
    details.join(' · '),
  ].join('\n')
}

export function slackMessage(alerts: Alert[]): SlackMessage {
  const shown = alerts.slice(0, MAX_ALERTS_PER_MESSAGE).map(describeAlert)
  const hidden = alerts.length - MAX_ALERTS_PER_MESSAGE
  if (hidden > 0) {
    const all = `${SENTRY_ORG_URL}/issues/?project=${PROJECT_ID}&environment=${ENVIRONMENT}`
    shown.push(`…and ${hidden} more. <${all}|See them all in Sentry>`)
  }
  return { text: shown.join('\n\n'), unfurl_links: false, unfurl_media: false }
}

export async function runBridge(deps: BridgeDeps) {
  const state = await deps.readState()
  const response = await deps.fetch(issuesUrl(), {
    headers: { Authorization: `Bearer ${deps.token}` },
  })
  if (!response.ok) {
    throw new Error(`Sentry answered ${response.status} when listing issues`)
  }
  const issues = parseIssues(await response.json())
  const alerts = pickAlerts(issues, state, deps.now)
  if (alerts.length > 0) {
    const posted = await deps.fetch(deps.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage(alerts)),
    })
    if (!posted.ok) {
      throw new Error(`Slack answered ${posted.status} to the alert`)
    }
  }
  await deps.writeState(nextState(issues, deps.now))
  return alerts.length
}

async function main() {
  const token = process.env.SENTRY_READ_TOKEN
  const webhookUrl = process.env.SLACK_ALERTS_WEBHOOK_URL
  if (!token || !webhookUrl) {
    console.log(
      '::warning::SENTRY_READ_TOKEN or SLACK_ALERTS_WEBHOOK_URL is not set, so Sentry was not checked.'
    )
    return
  }
  if (!webhookUrl.startsWith('https://hooks.slack.com/')) {
    throw new Error('SLACK_ALERTS_WEBHOOK_URL is not a Slack webhook URL')
  }
  const stateFile =
    process.env.SENTRY_SLACK_STATE_FILE || '.sentry-slack-state.json'
  const count = await runBridge({
    fetch,
    token,
    webhookUrl,
    now: new Date(),
    readState: async () =>
      parseState(await readFile(stateFile, 'utf8').catch(() => '')),
    writeState: (state) => writeFile(stateFile, JSON.stringify(state)),
  })
  console.log(
    count === 0
      ? 'Nothing new in production.'
      : `Posted ${plural(count, 'alert')} to Slack.`
  )
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
}
