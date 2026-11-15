import type { Database } from '@/lib/db'
import { deleteVideoFiles } from '@/lib/video-render/blob'
import { listUserVideoFiles } from './orders'

export async function deleteUserVideos(db: Database, userId: string) {
  const files = await listUserVideoFiles(db, userId)
  await deleteVideoFiles(files.map((file) => file.pathname))
}
