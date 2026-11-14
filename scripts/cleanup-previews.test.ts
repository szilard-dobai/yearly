// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import {
  type CleanupDeps,
  cleanup,
  deploymentsUrl,
  parseDeployments,
  parseNeonBranches,
  parsePullRequests,
  pickStaleRefs,
  runCleanup,
} from './cleanup-previews.mjs'

const REPO = 'szilard-dobai/yearly'

function deployment(ref: string, overrides: Record<string, unknown> = {}) {
  return {
    uid: `dpl_${ref.replace(/\W/g, '')}`,
    url: `yearly-${ref.replace(/\W/g, '')}.vercel.app`,
    target: null,
    meta: { githubCommitRef: ref },
    ...overrides,
  }
}

function neonBranch(name: string, overrides: Record<string, unknown> = {}) {
  return {
    id: `br-${name.replace(/\W/g, '-')}`,
    name,
    default: false,
    primary: false,
    protected: false,
    ...overrides,
  }
}

function pull(ref: string, state: 'open' | 'closed', repo = REPO) {
  return { state, head: { ref, repo: { full_name: repo } } }
}

type Route = { status?: number; body?: unknown }

function fakeApi(routes: {
  deployments?: unknown[][]
  neon?: unknown[]
  branches?: unknown[]
  pulls?: unknown[]
  neonDelete?: number[]
}) {
  const calls: { method: string; url: string }[] = []
  const neonDeletes = [...(routes.neonDelete ?? [])]
  const fetchMock = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    calls.push({ method, url })
    let route: Route = { status: 404 }
    if (method === 'GET' && url.includes('api.vercel.com/v7/deployments')) {
      const pages = routes.deployments ?? [[]]
      const until = new URL(url).searchParams.get('until')
      const index = until ? Number(until) : 0
      route = {
        body: {
          deployments: pages[index] ?? [],
          pagination: { next: index + 1 < pages.length ? index + 1 : null },
        },
      }
    } else if (method === 'GET' && url.includes('console.neon.tech')) {
      route = { body: { branches: routes.neon ?? [] } }
    } else if (method === 'GET' && url.includes('/branches?')) {
      route = { body: routes.branches ?? [] }
    } else if (method === 'GET' && url.includes('/pulls?')) {
      route = { body: routes.pulls ?? [] }
    } else if (method === 'DELETE' && url.includes('console.neon.tech')) {
      route = { status: neonDeletes.shift() ?? 200, body: {} }
    } else if (method === 'DELETE') {
      route = { status: 200, body: {} }
    }
    return new Response(JSON.stringify(route.body ?? {}), {
      status: route.status ?? 200,
    })
  })
  return { fetch: fetchMock as unknown as typeof fetch, calls }
}

function deps(
  fetchImpl: typeof fetch,
  overrides: Partial<CleanupDeps> = {}
): CleanupDeps {
  return {
    fetch: fetchImpl,
    vercelToken: 'vercel-token',
    neonApiKey: 'neon-key',
    neonProjectId: 'proj-123',
    githubToken: 'gh-token',
    repository: REPO,
    dryRun: false,
    log: () => {},
    sleep: async () => {},
    ...overrides,
  }
}

const deletes = (calls: { method: string; url: string }[]) =>
  calls.filter((call) => call.method === 'DELETE').map((call) => call.url)

describe('deploymentsUrl', () => {
  it('lists the yearly project in the team, with a page cursor', () => {
    const url = new URL(deploymentsUrl(1234))
    expect(url.pathname).toBe('/v7/deployments')
    expect(url.searchParams.get('projectId')).toBe('yearly')
    expect(url.searchParams.get('slug')).toBe('szilarddobais-projects')
    expect(url.searchParams.get('until')).toBe('1234')
  })
})

describe('parseDeployments', () => {
  it('keeps preview deployments and their git branch', () => {
    const { deployments, next } = parseDeployments({
      deployments: [deployment('feature/a')],
      pagination: { next: 99 },
    })
    expect(deployments).toEqual([
      {
        uid: 'dpl_featurea',
        url: 'yearly-featurea.vercel.app',
        ref: 'feature/a',
      },
    ])
    expect(next).toBe(99)
  })

  it('never returns production or other targeted deployments', () => {
    const { deployments } = parseDeployments({
      deployments: [
        deployment('feature/a', { target: 'production' }),
        deployment('feature/b', { target: 'staging' }),
        deployment('feature/c', { meta: {} }),
      ],
    })
    expect(deployments).toEqual([])
  })

  it('stops paging when next is null or missing', () => {
    expect(
      parseDeployments({ deployments: [], pagination: { next: null } }).next
    ).toBeNull()
    expect(parseDeployments({ deployments: [] }).next).toBeNull()
    expect(parseDeployments({ pagination: { next: '42' } }).next).toBe(42)
  })
})

describe('parseNeonBranches', () => {
  it('keeps only preview branches that are not default, primary or protected', () => {
    const branches = parseNeonBranches({
      branches: [
        neonBranch('main', { default: true, primary: true }),
        neonBranch('preview/feature/a'),
        neonBranch('preview/feature/b', { protected: true }),
        neonBranch('preview/feature/c', { default: true }),
        neonBranch('preview/main'),
        neonBranch('dev'),
      ],
    })
    expect(branches).toEqual([
      {
        id: 'br-preview-feature-a',
        name: 'preview/feature/a',
        ref: 'feature/a',
      },
    ])
  })
})

describe('parsePullRequests', () => {
  it('ignores pull requests from forks', () => {
    expect(
      parsePullRequests(
        [
          pull('feature/a', 'open'),
          pull('feature/b', 'open', 'someone/yearly'),
        ],
        REPO
      )
    ).toEqual([{ ref: 'feature/a', open: true }])
  })
})

describe('pickStaleRefs', () => {
  it('picks deleted branches and branches whose pull requests are all closed', () => {
    const stale = pickStaleRefs(
      ['deleted', 'merged', 'open', 'reopened', 'no-pr', 'main'],
      ['merged', 'open', 'reopened', 'no-pr', 'main'],
      [
        { ref: 'merged', open: false },
        { ref: 'open', open: true },
        { ref: 'reopened', open: false },
        { ref: 'reopened', open: true },
      ]
    )
    expect(stale).toEqual(['deleted', 'merged'])
  })

  it('never picks main, even when it looks deleted', () => {
    expect(pickStaleRefs(['main', ''], [], [])).toEqual([])
  })
})

describe('cleanup', () => {
  it('deletes the database branch and every preview deployment of the branch', async () => {
    const api = fakeApi({
      deployments: [
        [deployment('feature/a'), deployment('feature/b')],
        [
          deployment('feature/a', {
            uid: 'dpl_older',
            url: 'older.vercel.app',
          }),
        ],
      ],
      neon: [
        neonBranch('main', { default: true }),
        neonBranch('preview/feature/a'),
      ],
    })
    const result = await cleanup(deps(api.fetch), ['feature/a'])
    expect(result).toEqual({ deployments: 2, databases: 1 })
    expect(deletes(api.calls)).toEqual([
      'https://console.neon.tech/api/v2/projects/proj-123/branches/br-preview-feature-a',
      'https://api.vercel.com/v13/deployments/dpl_featurea?slug=szilarddobais-projects',
      'https://api.vercel.com/v13/deployments/dpl_older?slug=szilarddobais-projects',
    ])
  })

  it('refuses to touch main', async () => {
    const api = fakeApi({
      deployments: [[deployment('main')]],
      neon: [neonBranch('preview/main')],
    })
    const result = await cleanup(deps(api.fetch), ['main'])
    expect(result).toEqual({ deployments: 0, databases: 0 })
    expect(api.calls).toEqual([])
  })

  it('deletes nothing in a dry run', async () => {
    const api = fakeApi({
      deployments: [[deployment('feature/a')]],
      neon: [neonBranch('preview/feature/a')],
    })
    const log = vi.fn()
    const result = await cleanup(deps(api.fetch, { dryRun: true, log }), [
      'feature/a',
    ])
    expect(result).toEqual({ deployments: 1, databases: 1 })
    expect(deletes(api.calls)).toEqual([])
    expect(log).toHaveBeenCalledWith(
      'Would delete Neon branch preview/feature/a'
    )
  })

  it('waits and retries while Neon is busy with another operation', async () => {
    const api = fakeApi({
      neon: [neonBranch('preview/feature/a')],
      neonDelete: [423, 423, 200],
    })
    const sleep = vi.fn(async () => {})
    await cleanup(deps(api.fetch, { vercelToken: undefined, sleep }), [
      'feature/a',
    ])
    expect(deletes(api.calls)).toHaveLength(3)
    expect(sleep).toHaveBeenCalledTimes(2)
  })

  it('treats an already deleted database branch as done', async () => {
    const api = fakeApi({
      neon: [neonBranch('preview/feature/a')],
      neonDelete: [404],
    })
    await expect(
      cleanup(deps(api.fetch, { vercelToken: undefined }), ['feature/a'])
    ).resolves.toEqual({ deployments: 0, databases: 1 })
  })

  it('fails loudly on other API errors', async () => {
    const api = fakeApi({
      neon: [neonBranch('preview/feature/a')],
      neonDelete: [500],
    })
    await expect(
      cleanup(deps(api.fetch, { vercelToken: undefined }), ['feature/a'])
    ).rejects.toThrow('Deleting Neon branch preview/feature/a failed with 500')
  })
})

describe('runCleanup', () => {
  it('warns and does nothing without credentials', async () => {
    const api = fakeApi({})
    const log = vi.fn()
    const result = await runCleanup(
      deps(api.fetch, { vercelToken: undefined, neonApiKey: undefined, log }),
      ['feature/a']
    )
    expect(result).toEqual({ deployments: 0, databases: 0 })
    expect(api.calls).toEqual([])
    expect(log.mock.calls[0][0]).toMatch(/^::warning::/)
  })

  it('cleans up stale branches found from deployments and database branches', async () => {
    const api = fakeApi({
      deployments: [
        [
          deployment('merged'),
          deployment('open'),
          deployment('main'),
          deployment('main', { target: 'production', uid: 'dpl_prod' }),
        ],
      ],
      neon: [
        neonBranch('main', { default: true }),
        neonBranch('preview/deleted'),
        neonBranch('preview/open'),
      ],
      branches: [{ name: 'main' }, { name: 'merged' }, { name: 'open' }],
      pulls: [pull('merged', 'closed'), pull('open', 'open')],
    })
    const result = await runCleanup(deps(api.fetch), ['--stale'])
    expect(result).toEqual({ deployments: 1, databases: 1 })
    expect(deletes(api.calls)).toEqual([
      'https://console.neon.tech/api/v2/projects/proj-123/branches/br-preview-deleted',
      'https://api.vercel.com/v13/deployments/dpl_merged?slug=szilarddobais-projects',
    ])
  })

  it('does not call GitHub when there is nothing to check', async () => {
    const api = fakeApi({ neon: [neonBranch('main', { default: true })] })
    await runCleanup(deps(api.fetch), ['--stale'])
    expect(api.calls.some((call) => call.url.includes('api.github.com'))).toBe(
      false
    )
  })
})
