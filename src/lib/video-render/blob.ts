import { getVercelOidcToken } from '@vercel/functions/oidc'
import type { VideoFile } from '@/lib/db/schema'
import { del, issueSignedToken, presignUrl, put } from '@vercel/blob'

const DOWNLOAD_LINK_MINUTES = 10

async function storeOptions() {
  const storeId = process.env.VIDEOS_BLOB_STORE_ID
  if (!storeId) throw new Error('VIDEOS_BLOB_STORE_ID is not set')
  const oidcToken = await getVercelOidcToken()
  return { access: 'private' as const, storeId, oidcToken }
}

export function blobEnvironment(): string {
  return process.env.VERCEL_ENV ?? 'development'
}

export async function uploadFile(
  pathname: string,
  file: Buffer,
  contentType: string
) {
  await put(pathname, file, {
    ...(await storeOptions()),
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  })
}

export async function getVideoDownloadUrl(pathname: string): Promise<string> {
  const { storeId, oidcToken } = await storeOptions()
  const validUntil = Date.now() + DOWNLOAD_LINK_MINUTES * 60 * 1000
  const signed = await issueSignedToken({
    storeId,
    oidcToken,
    pathname,
    operations: ['get'],
    validUntil,
  })
  const { presignedUrl } = await presignUrl(signed, {
    operation: 'get',
    pathname,
    access: 'private',
    validUntil,
  })
  return presignedUrl
}

export function filePathnames(files: VideoFile[]): string[] {
  return files.flatMap((file) =>
    file.posterPathname ? [file.pathname, file.posterPathname] : [file.pathname]
  )
}

export async function deleteVideoFiles(files: VideoFile[]) {
  const pathnames = filePathnames(files)
  if (pathnames.length === 0) return
  await del(pathnames, await storeOptions())
}
