'use client'

import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth/client'
import { readStoredDays, writeStoredDays } from '@/lib/calendar-sync/local'
import { forgetSyncedCalendar } from '@/lib/calendar-sync/sign-out'
import { runCalendarSync } from '@/lib/calendar-sync/sync'
import { trackEvent } from '@/lib/tracking'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface AccountDetailsProps {
  userId: string
  email: string
}

export default function AccountDetails({ userId, email }: AccountDetailsProps) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'signing-out' | 'unsaved'>('idle')

  const signOut = async (saveFirst: boolean) => {
    setState('signing-out')
    if (saveFirst) {
      try {
        await runCalendarSync({
          userId,
          refresh: false,
          readLocal: readStoredDays,
          writeLocal: writeStoredDays,
        })
      } catch (error) {
        console.error('Failed to save before signing out:', error)
        setState('unsaved')
        return
      }
    }
    await authClient.signOut()
    forgetSyncedCalendar()
    trackEvent('sign_out', { unsavedChanges: !saveFirst })
    router.replace('/')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <p className="font-medium break-all text-gray-900 dark:text-zinc-100">
        {email}
      </p>

      {state === 'unsaved' ? (
        <div className="space-y-3" role="alert">
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            Your latest changes haven&apos;t reached your account yet. If you
            sign out now, they&apos;ll stay on this device.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => signOut(true)}>
              Try again
            </Button>
            <Button variant="ghost" onClick={() => signOut(false)}>
              Sign out anyway
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Button
            variant="outline"
            onClick={() => signOut(true)}
            disabled={state === 'signing-out'}
          >
            {state === 'signing-out' && (
              <Loader2 className="size-4 animate-spin" />
            )}
            Sign out
          </Button>
          <p className="text-sm text-gray-500 dark:text-zinc-500">
            Signing out removes your trips from this device. They stay saved in
            your account.
          </p>
        </>
      )}
    </div>
  )
}
