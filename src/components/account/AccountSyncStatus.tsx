import type { SyncStatus } from '@/lib/calendar-sync/useCalendarSync'
import { CloudAlert, CloudCheck, Loader2 } from 'lucide-react'

interface AccountSyncStatusProps {
  status: SyncStatus
  email: string
}

export default function AccountSyncStatus({
  status,
  email,
}: AccountSyncStatusProps) {
  return (
    <p
      role="status"
      className="flex items-start gap-2 text-sm text-gray-600 dark:text-zinc-400"
    >
      {status === 'saving' && (
        <>
          <Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
          <span>Saving to your account…</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <CloudCheck className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400" />
          <span>
            Saved to{' '}
            <span className="font-medium break-all text-gray-900 dark:text-zinc-100">
              {email}
            </span>
          </span>
        </>
      )}
      {status === 'error' && (
        <>
          <CloudAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>
            Couldn&apos;t reach your account. Your trips are safe on this
            device, and we&apos;ll try again.
          </span>
        </>
      )}
    </p>
  )
}
