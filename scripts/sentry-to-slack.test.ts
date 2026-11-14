// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import {
  type BridgeState,
  type SentryIssue,
  escapeSlack,
  issuesUrl,
  nextState,
  parseIssues,
  parseState,
  pickAlerts,
  runBridge,
  slackMessage,
} from './sentry-to-slack.mjs'

const NOW = new Date('2026-11-14T12:00:00Z')
const minutesAgo = (minutes: number) =>
  new Date(NOW.getTime() - minutes * 60_000).toISOString()

function issue(overrides: Partial<SentryIssue> = {}): SentryIssue {
  return {
    id: '161099392',
    shortId: 'YEARLY-1',
    title: 'TypeError: Cannot read properties of undefined',
    culprit: 'GET /api/calendar',
    substatus: 'new',
    firstSeen: minutesAgo(5),
    lastSeen: minutesAgo(5),
    count: 1,
    ...overrides,
  }
}

function stateAt(
  checkedAt: string,
  issues: Record<string, string> = {}
): BridgeState {
  return { checkedAt, issues }
}

describe('parseIssues', () => {
  it('reads the fields it needs from the Sentry response', () => {
    const [parsed] = parseIssues([
      {
        id: '161099392',
        shortId: 'YEARLY-1',
        title: 'Error: boom',
        culprit: 'GET /api/x',
        substatus: 'new',
        firstSeen: '2026-11-14T09:59:33Z',
        lastSeen: '2026-11-14T10:01:00Z',
        count: '12',
        userCount: 3,
        metadata: { value: 'ignored' },
      },
    ])
    expect(parsed).toEqual({
      id: '161099392',
      shortId: 'YEARLY-1',
      title: 'Error: boom',
      culprit: 'GET /api/x',
      substatus: 'new',
      firstSeen: '2026-11-14T09:59:33Z',
      lastSeen: '2026-11-14T10:01:00Z',
      count: 12,
    })
  })

  it('skips issues with an unexpected ID or dates', () => {
    const good = { id: '1', firstSeen: minutesAgo(1), lastSeen: minutesAgo(1) }
    expect(
      parseIssues([
        good,
        { ...good, id: '../../evil' },
        { ...good, id: 2 },
        { ...good, firstSeen: 'yesterday' },
        { ...good, lastSeen: undefined },
        null,
        'text',
      ]).map((parsed) => parsed.id)
    ).toEqual(['1'])
  })

  it('fills missing text and counts with safe defaults', () => {
    const [parsed] = parseIssues([
      {
        id: '1',
        firstSeen: minutesAgo(1),
        lastSeen: minutesAgo(1),
        count: 'x',
      },
    ])
    expect(parsed).toMatchObject({
      shortId: '',
      title: '',
      culprit: '',
      substatus: '',
      count: 0,
    })
  })

  it('refuses anything that is not a list', () => {
    expect(() => parseIssues({ detail: 'Invalid token' })).toThrow(
      'Sentry did not return a list of issues'
    )
  })
})

describe('parseState', () => {
  it('reads a saved state', () => {
    const saved = stateAt(minutesAgo(15), { '1': 'new', '2': 'ongoing' })
    expect(parseState(JSON.stringify(saved))).toEqual(saved)
  })

  it('treats a missing or damaged file as no state', () => {
    expect(parseState('')).toBeNull()
    expect(parseState('{not json')).toBeNull()
    expect(parseState('null')).toBeNull()
    expect(parseState(JSON.stringify({ checkedAt: 'soon', issues: {} }))).toBe(
      null
    )
    expect(parseState(JSON.stringify({ checkedAt: minutesAgo(1) }))).toBeNull()
  })

  it('drops statuses that are not text', () => {
    const raw = JSON.stringify({
      checkedAt: minutesAgo(15),
      issues: { '1': 'new', '2': 5 },
    })
    expect(parseState(raw)?.issues).toEqual({ '1': 'new' })
  })
})

describe('pickAlerts', () => {
  it('on the first run, reports issues first seen in the last hour', () => {
    const alerts = pickAlerts(
      [
        issue({ id: '1', firstSeen: minutesAgo(30) }),
        issue({ id: '2', firstSeen: minutesAgo(90), substatus: 'ongoing' }),
      ],
      null,
      NOW
    )
    expect(alerts.map((alert) => [alert.issue.id, alert.kind])).toEqual([
      ['1', 'new'],
    ])
  })

  it('reports an issue that appeared since the last check', () => {
    const alerts = pickAlerts(
      [issue({ id: '3', firstSeen: minutesAgo(5) })],
      stateAt(minutesAgo(15), { '1': 'ongoing' }),
      NOW
    )
    expect(alerts).toEqual([{ kind: 'new', issue: expect.anything() }])
  })

  it('reports each new issue once', () => {
    const issues = [issue({ id: '3', firstSeen: minutesAgo(5) })]
    expect(pickAlerts(issues, stateAt(minutesAgo(15)), NOW)).toHaveLength(1)
    expect(pickAlerts(issues, nextState(issues, NOW), NOW)).toEqual([])
  })

  it('catches an issue that showed up just before the last check', () => {
    const alerts = pickAlerts(
      [issue({ id: '3', firstSeen: minutesAgo(25) })],
      stateAt(minutesAgo(15)),
      NOW
    )
    expect(alerts.map((alert) => alert.kind)).toEqual(['new'])
  })

  it('catches up on everything since a check that was long ago', () => {
    const alerts = pickAlerts(
      [issue({ id: '3', firstSeen: minutesAgo(60 * 24) })],
      stateAt(minutesAgo(60 * 48)),
      NOW
    )
    expect(alerts.map((alert) => alert.kind)).toEqual(['new'])
  })

  it('reports a known issue when it starts spiking or comes back', () => {
    const alerts = pickAlerts(
      [
        issue({ id: '1', substatus: 'escalating', firstSeen: minutesAgo(600) }),
        issue({ id: '2', substatus: 'regressed', firstSeen: minutesAgo(600) }),
      ],
      stateAt(minutesAgo(15), { '1': 'ongoing', '2': 'new' }),
      NOW
    )
    expect(alerts.map((alert) => [alert.issue.id, alert.kind])).toEqual([
      ['1', 'escalating'],
      ['2', 'regressed'],
    ])
  })

  it('stays quiet while a known issue keeps the same status', () => {
    const alerts = pickAlerts(
      [
        issue({ id: '1', substatus: 'escalating', firstSeen: minutesAgo(600) }),
        issue({ id: '2', substatus: 'ongoing', firstSeen: minutesAgo(600) }),
        issue({ id: '3', substatus: 'new', firstSeen: minutesAgo(30) }),
      ],
      stateAt(minutesAgo(15), { '1': 'escalating', '2': 'new', '3': 'new' }),
      NOW
    )
    expect(alerts).toEqual([])
  })

  it('reports a resolved issue that came back, even though it was not tracked', () => {
    const alerts = pickAlerts(
      [
        issue({
          id: '1',
          substatus: 'regressed',
          firstSeen: minutesAgo(60 * 24 * 7),
          lastSeen: minutesAgo(3),
        }),
        issue({
          id: '2',
          substatus: 'regressed',
          firstSeen: minutesAgo(60 * 24 * 7),
          lastSeen: minutesAgo(60 * 24),
        }),
      ],
      stateAt(minutesAgo(15)),
      NOW
    )
    expect(alerts.map((alert) => [alert.issue.id, alert.kind])).toEqual([
      ['1', 'regressed'],
    ])
  })

  it('ignores old ongoing issues it has not seen before', () => {
    const alerts = pickAlerts(
      [issue({ substatus: 'ongoing', firstSeen: minutesAgo(600) })],
      stateAt(minutesAgo(15)),
      NOW
    )
    expect(alerts).toEqual([])
  })
})

describe('nextState', () => {
  it('remembers the status of every open issue and forgets the rest', () => {
    expect(
      nextState(
        [
          issue({ id: '1', substatus: 'new' }),
          issue({ id: '2', substatus: 'escalating' }),
        ],
        NOW
      )
    ).toEqual({
      checkedAt: '2026-11-14T12:00:00.000Z',
      issues: { '1': 'new', '2': 'escalating' },
    })
  })
})

describe('slackMessage', () => {
  it('escapes the characters Slack uses for links and mentions', () => {
    expect(escapeSlack('<!channel> & <https://x.test|y>')).toBe(
      '&lt;!channel&gt; &amp; &lt;https://x.test|y&gt;'
    )
  })

  it('describes an alert with a link built from the issue ID', () => {
    const { text, unfurl_links } = slackMessage([
      {
        kind: 'new',
        issue: issue({ count: 3 }),
      },
    ])
    expect(text).toBe(
      [
        ':rotating_light: *New error in production*',
        '<https://szilard-dobai.sentry.io/issues/161099392/?environment=production|YEARLY-1> TypeError: Cannot read properties of undefined',
        '`GET /api/calendar` · 3 events',
      ].join('\n')
    )
    expect(unfurl_links).toBe(false)
  })

  it('never lets issue text become a mention, link or broken code span', () => {
    const { text } = slackMessage([
      {
        kind: 'escalating',
        issue: issue({
          shortId: 'YEARLY-<2>',
          title: '<!channel> <https://evil.test|click>',
          culprit: 'handler `x` <y>',
        }),
      },
    ])
    expect(text).not.toContain('<!channel>')
    expect(text).not.toContain('<https://evil.test')
    expect(text).toContain("`handler 'x' &lt;y&gt;`")
    expect(text).toContain('|YEARLY-&lt;2&gt;>')
  })

  it('names each kind of alert', () => {
    const kinds = ['new', 'regressed', 'escalating'] as const
    const { text } = slackMessage(
      kinds.map((kind) => ({ kind, issue: issue() }))
    )
    expect(text).toContain('*New error in production*')
    expect(text).toContain('*Resolved error is back in production*')
    expect(text).toContain('*Error is spiking in production*')
  })

  it('shortens long titles and leaves out an empty culprit', () => {
    const { text } = slackMessage([
      { kind: 'new', issue: issue({ title: 'x'.repeat(500), culprit: '' }) },
    ])
    const [, link, details] = text.split('\n')
    expect(link.endsWith(`${'x'.repeat(199)}…`)).toBe(true)
    expect(details).toBe('1 event')
  })

  it('lists at most ten alerts and links to the rest', () => {
    const alerts = Array.from({ length: 13 }, (_, index) => ({
      kind: 'new' as const,
      issue: issue({ id: String(index + 1), shortId: `YEARLY-${index + 1}` }),
    }))
    const { text } = slackMessage(alerts)
    expect(text).toContain('|YEARLY-10>')
    expect(text).not.toContain('|YEARLY-11>')
    expect(text).toContain(
      '…and 3 more. <https://szilard-dobai.sentry.io/issues/?project=4512429510492240&environment=production|See them all in Sentry>'
    )
  })
})

describe('runBridge', () => {
  const WEBHOOK = 'https://hooks.slack.com/services/T000/B000/secret'

  function setup({
    sentry = new Response(JSON.stringify([])),
    slack = new Response('ok'),
    state = null as BridgeState | null,
  } = {}) {
    const fetchMock = vi.fn<typeof fetch>(async (input) =>
      String(input) === WEBHOOK ? slack : sentry
    )
    const writeState = vi.fn<(state: BridgeState) => Promise<void>>(
      async () => {}
    )
    const run = () =>
      runBridge({
        fetch: fetchMock,
        token: 'read-token',
        webhookUrl: WEBHOOK,
        now: NOW,
        readState: async () => state,
        writeState,
      })
    return { fetchMock, writeState, run }
  }

  const sentryIssue = {
    id: '42',
    shortId: 'YEARLY-42',
    title: 'Error: boom',
    culprit: 'POST /api/sync',
    substatus: 'new',
    firstSeen: minutesAgo(4),
    lastSeen: minutesAgo(2),
    count: '2',
    userCount: 1,
  }

  it('asks Sentry for open production issues with the read token', async () => {
    const { fetchMock, run } = setup()
    await run()
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(issuesUrl())
    expect(String(url)).toContain('environment=production')
    expect(String(url)).toContain('query=is%3Aunresolved')
    expect(String(url)).toContain('project=4512429510492240')
    expect(String(url)).toMatch(/^https:\/\/de\.sentry\.io\/api\/0\//)
    expect(init?.headers).toEqual({ Authorization: 'Bearer read-token' })
  })

  it('posts one Slack message and saves what it saw', async () => {
    const { fetchMock, writeState, run } = setup({
      sentry: new Response(JSON.stringify([sentryIssue])),
      state: stateAt(minutesAgo(15)),
    })
    await expect(run()).resolves.toBe(1)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [url, init] = fetchMock.mock.calls[1]
    expect(url).toBe(WEBHOOK)
    expect(init?.method).toBe('POST')
    const body = JSON.parse(String(init?.body))
    expect(body.text).toContain('|YEARLY-42> Error: boom')
    expect(body.unfurl_links).toBe(false)
    expect(writeState).toHaveBeenCalledWith({
      checkedAt: NOW.toISOString(),
      issues: { '42': 'new' },
    })
  })

  it('does not post when nothing changed, but still saves the check', async () => {
    const { fetchMock, writeState, run } = setup({
      sentry: new Response(JSON.stringify([sentryIssue])),
      state: stateAt(minutesAgo(15), { '42': 'new' }),
    })
    await expect(run()).resolves.toBe(0)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(writeState).toHaveBeenCalledOnce()
  })

  it('stops without posting or saving when Sentry fails', async () => {
    const { fetchMock, writeState, run } = setup({
      sentry: new Response('{"detail":"Invalid token"}', { status: 401 }),
    })
    await expect(run()).rejects.toThrow(
      'Sentry answered 401 when listing issues'
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(writeState).not.toHaveBeenCalled()
  })

  it('keeps the old state when Slack fails, so the next run tries again', async () => {
    const { writeState, run } = setup({
      sentry: new Response(JSON.stringify([sentryIssue])),
      slack: new Response('invalid_token', { status: 403 }),
      state: stateAt(minutesAgo(15)),
    })
    await expect(run()).rejects.toThrow('Slack answered 403 to the alert')
    expect(writeState).not.toHaveBeenCalled()
  })

  it('never puts the token or webhook in an error message', async () => {
    const { run } = setup({
      sentry: new Response(JSON.stringify([sentryIssue])),
      slack: new Response('no', { status: 500 }),
    })
    const error = await run().catch((caught: Error) => caught)
    expect(String(error)).not.toContain('read-token')
    expect(String(error)).not.toContain(WEBHOOK)
  })
})
