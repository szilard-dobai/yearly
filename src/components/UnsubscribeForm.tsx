'use client'

import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

interface UnsubscribeFormProps {
  token: string
  freeUntil: string
  contactEmail: string
}

export default function UnsubscribeForm({
  token,
  freeUntil,
  contactEmail,
}: UnsubscribeFormProps) {
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>(
    'idle'
  )

  const unsubscribe = async () => {
    setStatus('saving')
    try {
      const response = await fetch(
        `/api/waitlist/unsubscribe?${new URLSearchParams({ token })}`,
        { method: 'POST' }
      )
      if (!response.ok) throw new Error(String(response.status))
      setStatus('done')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'done') {
    return (
      <div role="status" className="space-y-3">
        <p className="font-medium text-gray-900 dark:text-zinc-100">
          You&apos;re unsubscribed.
        </p>
        <p>
          We&apos;ve removed your email from the video waitlist. Your free first
          video still works: sign in with the same email by {freeUntil} to use
          it.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p>
        You&apos;ll stop getting emails about animated videos, and we&apos;ll
        remove your email from the waitlist.
      </p>
      <Button onClick={unsubscribe} disabled={status === 'saving'}>
        {status === 'saving' && <Loader2 className="size-4 animate-spin" />}
        Unsubscribe
      </Button>
      {status === 'error' && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          That didn&apos;t work. Try again, or email {contactEmail} and
          we&apos;ll remove you.
        </p>
      )}
    </div>
  )
}
