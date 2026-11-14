/**
 * Deletes the Vercel preview deployments and the Neon database branch of git
 * branches that are finished with.
 *
 * The Neon integration creates a database branch named preview/<git branch>
 * for a branch's first preview deployment, and only deletes it after every
 * deployment of that git branch is gone. Vercel keeps preview deployments for
 * weeks, so Neon's 10 free branches fill up and preview builds fail with
 * "Branch limit reached". The workflow in .github/workflows/preview-cleanup.yml
 * runs this when a pull request closes or a branch is deleted, and once a day
 * with --stale to catch anything missed. Needs no npm install: Node 24 runs
 * it directly.
 *
 * Usage:
 *   node scripts/cleanup-previews.mts <git branch>...
 *   node scripts/cleanup-previews.mts --stale
 *
 * --stale picks git branches that have a preview deployment or a database
 * branch, and that no longer exist or whose pull requests are all closed.
 * Branches that never had a pull request are left alone.
 *
 * Environment variables:
 *   - VERCEL_TOKEN: a Vercel token for the szilarddobais-projects team
 *   - NEON_API_KEY: a Neon API key with access to the project
 *   - NEON_PROJECT_ID: the Neon project's ID
 *   - GITHUB_TOKEN and GITHUB_REPOSITORY: needed by --stale
 *   - DRY_RUN=1 (optional): list what would be deleted, delete nothing
 */

import { pathToFileURL } from 'node:url'

const VERCEL_API = 'https://api.vercel.com'
const VERCEL_TEAM = 'szilarddobais-projects'
const VERCEL_PROJECT = 'yearly'
const NEON_API = 'https://console.neon.tech/api/v2'
const GITHUB_API = 'https://api.github.com'
const PRODUCTION_BRANCH = 'main'
const NEON_PREFIX = 'preview/'
const PAGE_SIZE = 100
const MAX_PAGES = 50
const NEON_LOCKED_RETRIES = 20
const NEON_LOCKED_WAIT_MS = 3000

export type Deployment = { uid: string; url: string; ref: string }

export type NeonBranch = { id: string; name: string; ref: string }

export type PullRequest = { ref: string; open: boolean }

export type CleanupDeps = {
  fetch: typeof fetch
  vercelToken?: string
  neonApiKey?: string
  neonProjectId?: string
  githubToken?: string
  repository?: string
  dryRun: boolean
  log: (message: string) => void
  sleep: (ms: number) => Promise<void>
}

export type CleanupResult = { deployments: number; databases: number }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function records(value: unknown) {
  return Array.isArray(value) ? value.filter(isRecord) : []
}

export function isCleanable(ref: string) {
  return ref.trim() !== '' && ref !== PRODUCTION_BRANCH
}

export function deploymentsUrl(until?: number) {
  const params = new URLSearchParams({
    projectId: VERCEL_PROJECT,
    slug: VERCEL_TEAM,
    limit: String(PAGE_SIZE),
  })
  if (until !== undefined) params.set('until', String(until))
  return `${VERCEL_API}/v7/deployments?${params}`
}

export function parseDeployments(data: unknown): {
  deployments: Deployment[]
  next: number | null
} {
  if (!isRecord(data)) return { deployments: [], next: null }
  const deployments = records(data.deployments).flatMap((item) => {
    const meta = isRecord(item.meta) ? item.meta : {}
    const ref = meta.githubCommitRef
    if (typeof item.uid !== 'string' || typeof ref !== 'string') return []
    if (item.target !== null && item.target !== undefined) return []
    return [
      {
        uid: item.uid,
        url: typeof item.url === 'string' ? item.url : item.uid,
        ref,
      },
    ]
  })
  const pagination = isRecord(data.pagination) ? data.pagination : {}
  const next = Number(pagination.next)
  return {
    deployments,
    next: pagination.next !== null && Number.isFinite(next) ? next : null,
  }
}

export function parseNeonBranches(data: unknown): NeonBranch[] {
  if (!isRecord(data)) return []
  return records(data.branches).flatMap((item) => {
    if (typeof item.id !== 'string' || typeof item.name !== 'string') return []
    if (item.default === true || item.primary === true) return []
    if (item.protected === true) return []
    if (!item.name.startsWith(NEON_PREFIX)) return []
    const ref = item.name.slice(NEON_PREFIX.length)
    return isCleanable(ref) ? [{ id: item.id, name: item.name, ref }] : []
  })
}

export function parseGitBranches(data: unknown): string[] {
  return records(data).flatMap((item) =>
    typeof item.name === 'string' ? [item.name] : []
  )
}

export function parsePullRequests(
  data: unknown,
  repository: string
): PullRequest[] {
  return records(data).flatMap((item) => {
    const head = isRecord(item.head) ? item.head : {}
    const repo = isRecord(head.repo) ? head.repo : {}
    if (typeof head.ref !== 'string') return []
    if (repo.full_name !== repository) return []
    return [{ ref: head.ref, open: item.state === 'open' }]
  })
}

export function pickStaleRefs(
  candidates: Iterable<string>,
  gitBranches: Iterable<string>,
  pullRequests: PullRequest[]
) {
  const existing = new Set(gitBranches)
  const stale = new Set<string>()
  for (const ref of candidates) {
    if (!isCleanable(ref)) continue
    if (!existing.has(ref)) {
      stale.add(ref)
      continue
    }
    const pulls = pullRequests.filter((pull) => pull.ref === ref)
    if (pulls.length > 0 && pulls.every((pull) => !pull.open)) stale.add(ref)
  }
  return [...stale].sort()
}

async function expectOk(response: Response, action: string) {
  if (response.ok) return
  const body = await response.text().catch(() => '')
  throw new Error(
    `${action} failed with ${response.status}: ${body.slice(0, 300)}`
  )
}

function vercelHeaders(deps: CleanupDeps) {
  return { Authorization: `Bearer ${deps.vercelToken}` }
}

function neonHeaders(deps: CleanupDeps) {
  return {
    Authorization: `Bearer ${deps.neonApiKey}`,
    Accept: 'application/json',
  }
}

function githubHeaders(deps: CleanupDeps) {
  return {
    Authorization: `Bearer ${deps.githubToken}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'yearly-preview-cleanup',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

export async function listDeployments(deps: CleanupDeps) {
  const all: Deployment[] = []
  let until: number | undefined
  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await deps.fetch(deploymentsUrl(until), {
      headers: vercelHeaders(deps),
    })
    await expectOk(response, 'Listing Vercel deployments')
    const { deployments, next } = parseDeployments(await response.json())
    all.push(...deployments)
    if (next === null) return all
    until = next
  }
  throw new Error(
    `Stopped after ${MAX_PAGES} pages of Vercel deployments; nothing deleted`
  )
}

export async function listNeonBranches(deps: CleanupDeps) {
  const response = await deps.fetch(
    `${NEON_API}/projects/${encodeURIComponent(deps.neonProjectId ?? '')}/branches?limit=10000`,
    { headers: neonHeaders(deps) }
  )
  await expectOk(response, 'Listing Neon branches')
  return parseNeonBranches(await response.json())
}

async function listGitHubPages(deps: CleanupDeps, path: string) {
  const items: unknown[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    const separator = path.includes('?') ? '&' : '?'
    const response = await deps.fetch(
      `${GITHUB_API}/repos/${deps.repository}/${path}${separator}per_page=${PAGE_SIZE}&page=${page}`,
      { headers: githubHeaders(deps) }
    )
    await expectOk(response, `Listing GitHub ${path}`)
    const data: unknown = await response.json()
    const batch = Array.isArray(data) ? data : []
    items.push(...batch)
    if (batch.length < PAGE_SIZE) return items
  }
  throw new Error(`Stopped after ${MAX_PAGES} pages of GitHub ${path}`)
}

async function deleteDeployment(deps: CleanupDeps, deployment: Deployment) {
  const params = new URLSearchParams({ slug: VERCEL_TEAM })
  const response = await deps.fetch(
    `${VERCEL_API}/v13/deployments/${encodeURIComponent(deployment.uid)}?${params}`,
    { method: 'DELETE', headers: vercelHeaders(deps) }
  )
  if (response.status === 404) return
  await expectOk(response, `Deleting deployment ${deployment.url}`)
}

async function deleteNeonBranch(deps: CleanupDeps, branch: NeonBranch) {
  const url = `${NEON_API}/projects/${encodeURIComponent(deps.neonProjectId ?? '')}/branches/${encodeURIComponent(branch.id)}`
  for (let attempt = 0; ; attempt++) {
    const response = await deps.fetch(url, {
      method: 'DELETE',
      headers: neonHeaders(deps),
    })
    if (response.status === 404) return
    if (response.status === 423 && attempt < NEON_LOCKED_RETRIES) {
      await deps.sleep(NEON_LOCKED_WAIT_MS)
      continue
    }
    await expectOk(response, `Deleting Neon branch ${branch.name}`)
    return
  }
}

export async function cleanup(
  deps: CleanupDeps,
  refs: string[],
  known: { deployments?: Deployment[]; neonBranches?: NeonBranch[] } = {}
): Promise<CleanupResult> {
  const targets = new Set(refs.filter(isCleanable))
  const result: CleanupResult = { deployments: 0, databases: 0 }
  if (targets.size === 0) return result
  const verb = deps.dryRun ? 'Would delete' : 'Deleted'

  if (deps.neonApiKey && deps.neonProjectId) {
    const branches = known.neonBranches ?? (await listNeonBranches(deps))
    for (const branch of branches.filter((item) => targets.has(item.ref))) {
      if (!deps.dryRun) await deleteNeonBranch(deps, branch)
      deps.log(`${verb} Neon branch ${branch.name}`)
      result.databases++
    }
  }

  if (deps.vercelToken) {
    const deployments = known.deployments ?? (await listDeployments(deps))
    for (const deployment of deployments.filter((item) =>
      targets.has(item.ref)
    )) {
      if (!deps.dryRun) await deleteDeployment(deps, deployment)
      deps.log(`${verb} ${deployment.url} (${deployment.ref})`)
      result.deployments++
    }
  }

  return result
}

export async function findStaleRefs(
  deps: CleanupDeps,
  deployments: Deployment[],
  neonBranches: NeonBranch[]
) {
  if (!deps.githubToken || !deps.repository) {
    throw new Error('--stale needs GITHUB_TOKEN and GITHUB_REPOSITORY')
  }
  const candidates = new Set([
    ...deployments.map((item) => item.ref),
    ...neonBranches.map((item) => item.ref),
  ])
  if (![...candidates].some(isCleanable)) return []
  const [branches, pulls] = await Promise.all([
    listGitHubPages(deps, 'branches'),
    listGitHubPages(deps, 'pulls?state=all'),
  ])
  return pickStaleRefs(
    candidates,
    parseGitBranches(branches),
    parsePullRequests(pulls, deps.repository)
  )
}

export async function runCleanup(deps: CleanupDeps, args: string[]) {
  const hasVercel = Boolean(deps.vercelToken)
  const hasNeon = Boolean(deps.neonApiKey && deps.neonProjectId)
  if (!hasVercel && !hasNeon) {
    deps.log(
      '::warning::VERCEL_TOKEN, NEON_API_KEY and NEON_PROJECT_ID are not set, so nothing was cleaned up.'
    )
    return { deployments: 0, databases: 0 }
  }
  if (!hasVercel)
    deps.log('::warning::VERCEL_TOKEN is not set; skipping Vercel.')
  if (!hasNeon) {
    deps.log(
      '::warning::NEON_API_KEY or NEON_PROJECT_ID is not set; skipping Neon.'
    )
  }

  if (args[0] !== '--stale') return cleanup(deps, args)

  const deployments = hasVercel ? await listDeployments(deps) : []
  const neonBranches = hasNeon ? await listNeonBranches(deps) : []
  const refs = await findStaleRefs(deps, deployments, neonBranches)
  deps.log(
    refs.length === 0
      ? 'No previews of closed or deleted branches.'
      : `Closed or deleted branches with previews: ${refs.join(', ')}`
  )
  return cleanup(deps, refs, { deployments, neonBranches })
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg.trim() !== '')
  if (args.length === 0) {
    throw new Error(
      'Pass the git branches to clean up, or --stale to find them'
    )
  }
  const dryRun = process.env.DRY_RUN === '1' || process.env.DRY_RUN === 'true'
  const result = await runCleanup(
    {
      fetch,
      vercelToken: process.env.VERCEL_TOKEN,
      neonApiKey: process.env.NEON_API_KEY,
      neonProjectId: process.env.NEON_PROJECT_ID,
      githubToken: process.env.GITHUB_TOKEN,
      repository: process.env.GITHUB_REPOSITORY,
      dryRun,
      log: (message) => console.log(message),
      sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    },
    args
  )
  console.log(
    `${dryRun ? 'Dry run: would delete' : 'Deleted'} ${plural(result.databases, 'database branch', 'database branches')} and ${plural(result.deployments, 'preview deployment', 'preview deployments')}.`
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
