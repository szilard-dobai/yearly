'use client'

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth/client'
import { forgetSyncedCalendar } from '@/lib/calendar-sync/sign-out'
import { clearSyncState } from '@/lib/calendar-sync/sync'
import { trackEvent } from '@/lib/tracking'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

type State = 'idle' | 'deleting' | 'sign-in-again' | 'error'

export default function DeleteAccount() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<State>('idle')

  const handleDelete = async () => {
    setState('deleting')
    const { error } = await authClient.deleteUser()
    if (error) {
      setState(error.code === 'SESSION_EXPIRED' ? 'sign-in-again' : 'error')
      return
    }
    clearSyncState()
    trackEvent('account_deleted')
    router.replace('/')
    router.refresh()
  }

  const handleSignInAgain = async () => {
    await authClient.signOut()
    forgetSyncedCalendar()
    router.replace('/sign-in?next=/account')
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-zinc-400">
        Deletes your account, your email address and the trips saved to it.
        Trips on this device stay here.
      </p>

      <AlertDialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setState('idle')
        }}
      >
        <AlertDialogTrigger asChild>
          <Button variant="outline" className="text-red-600 dark:text-red-400">
            Delete account
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent onOverlayClick={() => setOpen(false)}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes your account and the trips saved to it, and it
              can&apos;t be undone. Trips on this device stay here, so you can
              keep using Yearly without an account.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {state === 'sign-in-again' && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              For your security, sign in again before deleting your account.
            </p>
          )}
          {state === 'error' && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              We couldn&apos;t delete your account. Try again, or email
              hello@yearly.world.
            </p>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {state === 'sign-in-again' ? (
              <Button onClick={handleSignInAgain}>Sign in again</Button>
            ) : (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={state === 'deleting'}
              >
                {state === 'deleting' && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Delete account
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
