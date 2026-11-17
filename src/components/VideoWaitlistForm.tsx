'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { VideoWaitlistJoined } from '@/components/VideoWaitlistJoined'
import { useAccountEmail } from '@/lib/hooks/useAccountEmail'
import { joinWaitlist, leaveWaitlist } from '@/lib/waitlist/client'
import { useWaitlistStatus } from '@/lib/waitlist/useWaitlistStatus'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { type FormEvent, useState } from 'react'

const INPUT_ID = 'videos-waitlist-email'

export function VideoWaitlistForm() {
  const accountEmail = useAccountEmail()
  const [joinedOnAccount, setJoinedOnAccount] = useWaitlistStatus(
    'animated_video',
    accountEmail
  )
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isJoined, setIsJoined] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setIsSending(true)
    setError(null)
    try {
      await joinWaitlist({
        email: accountEmail ?? email,
        feature: 'animated_video',
        context: { launchOffer: 'first_video_free' },
      })
      setIsJoined(true)
      if (accountEmail) setJoinedOnAccount(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsSending(false)
    }
  }

  const handleLeave = async () => {
    await leaveWaitlist('animated_video')
    setJoinedOnAccount(false)
    setIsJoined(false)
  }

  if (isJoined || joinedOnAccount === true) {
    return (
      <VideoWaitlistJoined
        onLeave={accountEmail ? handleLeave : undefined}
        className="rounded-2xl border border-gray-200 bg-white p-5 text-left text-gray-700 shadow-sm dark:border-white/8 dark:bg-[#141414] dark:text-zinc-300"
      />
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5 text-left shadow-sm dark:border-white/8 dark:bg-[#141414]"
    >
      <label
        htmlFor={INPUT_ID}
        className="block text-sm text-gray-600 dark:text-zinc-400"
      >
        Join the list to get your{' '}
        <span className="font-medium text-gray-900 dark:text-zinc-100">
          first video free
        </span>{' '}
        at launch. We&apos;ll email you once, when videos are ready.
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={INPUT_ID}
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={accountEmail ?? email}
          readOnly={accountEmail !== null}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!error || undefined}
          className="h-11 bg-white read-only:bg-gray-100 read-only:text-gray-600 dark:bg-[#1a1a1a] dark:read-only:bg-white/5 dark:read-only:text-zinc-400"
        />
        <Button type="submit" disabled={isSending} className="h-11 px-5">
          {isSending && <Loader2 className="size-4 animate-spin" />}
          Save my free video
        </Button>
      </div>
      <p className="text-xs text-gray-500 dark:text-zinc-500">
        {accountEmail
          ? "This is the email you sign in with. We'll only use it for this."
          : "We'll only use your email for this."}{' '}
        <Link
          href="/privacy"
          className="underline underline-offset-2 hover:text-gray-900 dark:hover:text-zinc-100"
        >
          Privacy
        </Link>
      </p>
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </form>
  )
}
