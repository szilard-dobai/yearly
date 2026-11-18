import { createBulkSendStore } from '@/lib/email/bulk-send-store'
import type { ReminderDocument } from '@/lib/mongodb'
import type { Collection } from 'mongodb'

export function createReminderSendStore(
  collection: Collection<ReminderDocument>,
  year: number
) {
  return createBulkSendStore(collection, { year })
}
