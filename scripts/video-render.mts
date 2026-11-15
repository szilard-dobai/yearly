/**
 * Bundles the paid videos for server rendering and renders them on Vercel
 * Sandbox. See "Rendering" in docs/06-paid-videos.md.
 *
 * Usage:
 *   npm run video:bundle
 *     Bundles src/video-render into .video-render/bundle, with the fonts and
 *     the images in public/emoji, and prints the bundle's hash.
 *   node scripts/video-render.mts snapshot [--expires-hours 24]
 *     Creates a sandbox with Chrome and the bundle, snapshots it (which stops
 *     the sandbox) and prints the snapshot ID. 0 hours means it never expires.
 *   node scripts/video-render.mts sample --snapshot <id> [--kinds year,stats,month] [--theme dark|light]
 *     Renders the homepage example year, one sandbox per video, and saves the
 *     MP4s in .video-render/out.
 *   node scripts/video-render.mts delete-snapshot <id>
 *   node scripts/video-render.mts prepare
 *     Runs in vercel-build. Bundles, then reuses the snapshot for this bundle or
 *     makes one, and writes its ID to src/lib/video-render/deployment-snapshot.json
 *     so the deployment's render steps use it. Production snapshots last until
 *     pruned (the newest two are kept); preview snapshots expire after 48 hours.
 *     The bundle-to-snapshot index lives in the private videos Blob store under
 *     render-snapshots/. Set VIDEO_RENDER_SNAPSHOT=off to skip it in an
 *     emergency; that deployment can't render videos.
 *
 * Sandbox calls need VERCEL_OIDC_TOKEN, which `vercel env pull` writes and
 * which lasts about 12 hours. Keep the pulled file outside the repo and pass it
 * with `node --env-file=<file>`.
 */

import { bundle } from '@remotion/bundler'
import {
  addBundleToSandbox,
  createSandbox,
  renderMediaOnVercel,
} from '@remotion/vercel'
import { del, get, list, put } from '@vercel/blob'
import { getVercelOidcToken } from '@vercel/functions/oidc'
import { Sandbox, Snapshot } from '@vercel/sandbox'
import { createHash } from 'node:crypto'
import {
  cp,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'

const ROOT = path.resolve(import.meta.dirname, '..')
const WORK_DIR = path.join(ROOT, '.video-render')
const BUNDLE_DIR = path.join(WORK_DIR, 'bundle')
const OUT_DIR = path.join(WORK_DIR, 'out')
const DEPLOYMENT_FILE = path.join(
  ROOT,
  'src/lib/video-render/deployment-snapshot.json'
)
const INDEX_PREFIX = 'render-snapshots/'
const PREVIEW_SNAPSHOT_HOURS = 48
const PRODUCTION_SNAPSHOTS_KEPT = 2
const MIN_HOURS_LEFT_TO_REUSE = 6

const KINDS = ['year', 'stats', 'month'] as const
const VCPUS = 4
const CONCURRENCY = 4

async function listFiles(dir: string, base = dir): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name)
      return entry.isDirectory()
        ? listFiles(full, base)
        : [path.relative(base, full)]
    })
  )
  return files.flat().sort()
}

async function hashDirectory(dir: string) {
  const hash = createHash('sha256')
  let bytes = 0
  const files = await listFiles(dir)
  for (const file of files) {
    const content = await readFile(path.join(dir, file))
    hash.update(file).update('\0').update(content)
    bytes += content.length
  }
  return { hash: hash.digest('hex').slice(0, 16), bytes, files: files.length }
}

async function bundleVideos() {
  const started = performance.now()
  await rm(BUNDLE_DIR, { recursive: true, force: true })
  await bundle({
    entryPoint: path.join(ROOT, 'src/video-render/entry.ts'),
    outDir: BUNDLE_DIR,
    rootDir: ROOT,
    publicDir: path.join(WORK_DIR, 'no-public-dir'),
    enableCaching: false,
    webpackOverride: (config) => ({
      ...config,
      resolve: {
        ...config.resolve,
        alias: {
          ...(config.resolve?.alias as Record<string, string>),
          '@': path.join(ROOT, 'src'),
        },
      },
    }),
  })
  await cp(path.join(ROOT, 'public/emoji'), path.join(BUNDLE_DIR, 'emoji'), {
    recursive: true,
  })
  const summary = await hashDirectory(BUNDLE_DIR)
  console.log(
    `Bundled ${summary.files} files (${(summary.bytes / 1e6).toFixed(1)} MB) in ${((performance.now() - started) / 1000).toFixed(1)} s, hash ${summary.hash}`
  )
  return summary
}

async function snapshotBundle(expiresHours: number) {
  await stat(path.join(BUNDLE_DIR, 'index.html')).catch(() => {
    throw new Error('No bundle yet: run npm run video:bundle first')
  })
  const sandbox = await createSandbox({
    resources: { vcpus: VCPUS },
    onProgress: ({ message }) => console.log(message),
  })
  try {
    // addBundleToSandbox creates the bundle's subfolders (emoji/) before the
    // bundle folder itself, so make that first.
    await sandbox.mkDir('remotion-bundle')
    await addBundleToSandbox({ sandbox, bundleDir: BUNDLE_DIR })
    const snapshot = await sandbox.snapshot({
      expiration: expiresHours * 60 * 60 * 1000,
    })
    console.log(
      `Snapshot ${snapshot.snapshotId} (${(snapshot.sizeBytes / 1e9).toFixed(2)} GB)`
    )
    return snapshot.snapshotId
  } catch (error) {
    await sandbox.stop().catch(() => {})
    throw error
  }
}

async function renderSample(
  snapshotId: string,
  kinds: string[],
  theme: string
) {
  await mkdir(OUT_DIR, { recursive: true })
  const started = performance.now()
  const results = await Promise.allSettled(
    kinds.map(async (kind) => {
      const sandbox = await Sandbox.create({
        source: { type: 'snapshot', snapshotId },
        resources: { vcpus: VCPUS },
        timeout: 5 * 60 * 1000,
      })
      try {
        const { sandboxFilePath } = await renderMediaOnVercel({
          sandbox,
          compositionId: kind,
          inputProps: { theme },
          concurrency: CONCURRENCY,
        })
        const file = path.join(OUT_DIR, `${kind}-${theme}.mp4`)
        await sandbox.downloadFile({ path: sandboxFilePath }, { path: file })
        const seconds = ((performance.now() - started) / 1000).toFixed(1)
        console.log(`${kind}: ${file} after ${seconds} s`)
      } finally {
        await sandbox.stop().catch((error: Error) => {
          console.error(`Couldn't stop ${sandbox.sandboxId}: ${error.message}`)
        })
      }
    })
  )
  const failed = results.filter((result) => result.status === 'rejected')
  for (const failure of failed) console.error(failure.reason)
  if (failed.length > 0) process.exitCode = 1
}

type SnapshotEntry = {
  bundleHash: string
  snapshotId: string
  environment: 'production' | 'preview'
  createdAt: string
  expiresAt: string | null
}

async function indexOptions() {
  const storeId = process.env.VIDEOS_BLOB_STORE_ID
  if (!storeId) throw new Error('VIDEOS_BLOB_STORE_ID is not set')
  return {
    access: 'private' as const,
    storeId,
    oidcToken: await getVercelOidcToken(),
  }
}

async function readEntry(pathname: string): Promise<SnapshotEntry | null> {
  const result = await get(pathname, {
    ...(await indexOptions()),
    useCache: false,
  })
  if (!result || result.statusCode !== 200) return null
  return JSON.parse(await new Response(result.stream).text())
}

async function isReusable(entry: SnapshotEntry, environment: string) {
  if (environment === 'production' && entry.environment !== 'production') {
    return false
  }
  try {
    const snapshot = await Snapshot.get({ snapshotId: entry.snapshotId })
    const hoursLeft = snapshot.expiresAt
      ? (snapshot.expiresAt.getTime() - Date.now()) / 3_600_000
      : Infinity
    return snapshot.status === 'created' && hoursLeft > MIN_HOURS_LEFT_TO_REUSE
  } catch {
    return false
  }
}

async function pruneSnapshots(currentHash: string) {
  const options = await indexOptions()
  const { blobs } = await list({ ...options, prefix: INDEX_PREFIX })
  const entries = (
    await Promise.all(
      blobs.map(async ({ pathname }) => ({
        pathname,
        entry: await readEntry(pathname),
      }))
    )
  ).filter((item): item is { pathname: string; entry: SnapshotEntry } =>
    Boolean(item.entry)
  )

  const production = entries
    .filter(({ entry }) => entry.environment === 'production')
    .filter(({ entry }) => entry.bundleHash !== currentHash)
    .sort((a, b) => b.entry.createdAt.localeCompare(a.entry.createdAt))
  const stale = production.slice(PRODUCTION_SNAPSHOTS_KEPT - 1)
  const expired = entries.filter(
    ({ entry }) =>
      entry.expiresAt !== null && Date.parse(entry.expiresAt) < Date.now()
  )

  for (const { pathname, entry } of stale) {
    await Snapshot.get({ snapshotId: entry.snapshotId })
      .then((snapshot) => snapshot.delete())
      .catch((error: Error) => {
        console.warn(`Couldn't delete ${entry.snapshotId}: ${error.message}`)
      })
    await del(pathname, options)
    console.log(`Deleted old production snapshot ${entry.snapshotId}`)
  }
  for (const { pathname } of expired) await del(pathname, options)
}

async function prepareDeployment() {
  const vercelEnv = process.env.VERCEL_ENV
  if (!vercelEnv) {
    console.log(
      'Not a Vercel build, so no render snapshot. Local renders use VIDEO_SNAPSHOT_ID.'
    )
    return
  }
  if (process.env.VIDEO_RENDER_SNAPSHOT === 'off') {
    console.warn(
      "VIDEO_RENDER_SNAPSHOT=off: this deployment can't render videos"
    )
    return
  }
  const environment = vercelEnv === 'production' ? 'production' : 'preview'

  const { hash } = await bundleVideos()
  const pathname = `${INDEX_PREFIX}${hash}.json`
  let entry = await readEntry(pathname)
  if (entry && (await isReusable(entry, environment))) {
    console.log(`Reusing snapshot ${entry.snapshotId} for bundle ${hash}`)
  } else {
    const hours = environment === 'production' ? 0 : PREVIEW_SNAPSHOT_HOURS
    const snapshotId = await snapshotBundle(hours)
    entry = {
      bundleHash: hash,
      snapshotId,
      environment,
      createdAt: new Date().toISOString(),
      expiresAt: hours
        ? new Date(Date.now() + hours * 3_600_000).toISOString()
        : null,
    }
    await put(pathname, JSON.stringify(entry), {
      ...(await indexOptions()),
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true,
    })
  }

  await writeFile(
    DEPLOYMENT_FILE,
    JSON.stringify({ snapshotId: entry.snapshotId, bundleHash: hash }) + '\n'
  )
  if (environment === 'production') await pruneSnapshots(hash)
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    snapshot: { type: 'string' },
    kinds: { type: 'string', default: KINDS.join(',') },
    theme: { type: 'string', default: 'dark' },
    'expires-hours': { type: 'string', default: '24' },
  },
})

const [command, argument] = positionals

if (command === 'bundle') {
  await bundleVideos()
} else if (command === 'snapshot') {
  const expiresHours = Number(values['expires-hours'])
  if (!Number.isFinite(expiresHours) || expiresHours < 0) {
    throw new Error('--expires-hours must be 0 or more')
  }
  await snapshotBundle(expiresHours)
} else if (command === 'sample') {
  if (!values.snapshot) throw new Error('Pass --snapshot <id>')
  const kinds = values.kinds.split(',')
  const unknown = kinds.filter(
    (kind) => !(KINDS as readonly string[]).includes(kind)
  )
  if (unknown.length > 0)
    throw new Error(`Unknown kinds: ${unknown.join(', ')}`)
  if (!['dark', 'light'].includes(values.theme)) {
    throw new Error('--theme must be dark or light')
  }
  await renderSample(values.snapshot, kinds, values.theme)
} else if (command === 'prepare') {
  try {
    await prepareDeployment()
  } catch (error) {
    if (process.env.VERCEL_ENV === 'production') throw error
    console.warn("Couldn't prepare a render snapshot for this preview", error)
  }
} else if (command === 'delete-snapshot') {
  if (!argument) throw new Error('Pass the snapshot ID')
  const snapshot = await Snapshot.get({ snapshotId: argument })
  await snapshot.delete()
  console.log(`Deleted ${argument}`)
} else {
  throw new Error(
    'Usage: node scripts/video-render.mts bundle | snapshot | sample --snapshot <id> | delete-snapshot <id> | prepare'
  )
}
