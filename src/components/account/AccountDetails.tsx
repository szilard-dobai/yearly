'use client'

import { Button } from '@/components/ui/button'
import { authClient } from '@/lib/auth/client'
import { forgetSyncedCalendar } from '@/lib/calendar-sync/sign-out'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface AccountDetailsProps {
  email: string
}

export default function AccountDetails({ email }: AccountDetailsProps) {
  const router = useRouter()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await authClient.signOut()
    forgetSyncedCalendar()
    router.replace('/')
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <p className="font-medium break-all text-gray-900 dark:text-zinc-100">
        {email}
      </p>
      <Button variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
        {isSigningOut && <Loader2 className="size-4 animate-spin" />}
        Sign out
      </Button>
      <p className="text-sm text-gray-500 dark:text-zinc-500">
        Signing out removes your trips from this device. They stay saved in your
        account.
      </p>
    </div>
  )
}
