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
import { Sandbox, Snapshot } from '@vercel/sandbox'
import { createHash } from 'node:crypto'
import { cp, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { parseArgs } from 'node:util'

const ROOT = path.resolve(import.meta.dirname, '..')
const WORK_DIR = path.join(ROOT, '.video-render')
const BUNDLE_DIR = path.join(WORK_DIR, 'bundle')
const OUT_DIR = path.join(WORK_DIR, 'out')

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
  await snapshotBundle(Number(values['expires-hours']))
} else if (command === 'sample') {
  if (!values.snapshot) throw new Error('Pass --snapshot <id>')
  const kinds = values.kinds.split(',')
  const unknown = kinds.filter(
    (kind) => !(KINDS as readonly string[]).includes(kind)
  )
  if (unknown.length > 0)
    throw new Error(`Unknown kinds: ${unknown.join(', ')}`)
  await renderSample(values.snapshot, kinds, values.theme)
} else if (command === 'delete-snapshot') {
  if (!argument) throw new Error('Pass the snapshot ID')
  const snapshot = await Snapshot.get({ snapshotId: argument })
  await snapshot.delete()
  console.log(`Deleted ${argument}`)
} else {
  throw new Error(
    'Usage: node scripts/video-render.mts bundle | snapshot | sample --snapshot <id> | delete-snapshot <id>'
  )
}
