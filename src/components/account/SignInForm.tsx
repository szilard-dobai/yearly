'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth/client'
import { SIGN_IN_LINK_MINUTES } from '@/lib/email/sign-in-link'
import { Loader2, MailCheck } from 'lucide-react'
import { useState } from 'react'

interface SignInFormProps {
  googleEnabled: boolean
  callbackURL?: string
}

export default function SignInForm({
  googleEnabled,
  callbackURL = '/account',
}: SignInFormProps) {
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setIsSending(true)

    const trimmed = email.trim()
    const { error: sendError } = await authClient.signIn.magicLink({
      email: trimmed,
      callbackURL,
      errorCallbackURL: '/account',
    })

    setIsSending(false)
    if (sendError) {
      setError(
        sendError.status === 429
          ? 'Too many sign-in emails. Try again in a few minutes.'
          : "We couldn't send the email. Check the address and try again."
      )
      return
    }
    setSentTo(trimmed)
  }

  const handleGoogle = async () => {
    setError('')
    setIsRedirecting(true)
    const { error: googleError } = await authClient.signIn.social({
      provider: 'google',
      callbackURL,
      errorCallbackURL: '/account',
    })
    if (googleError) {
      setIsRedirecting(false)
      setError("Google sign-in didn't start. Try again, or use your email.")
    }
  }

  if (sentTo) {
    return (
      <div className="space-y-3" role="status">
        <MailCheck className="size-6 text-gray-900 dark:text-zinc-100" />
        <p className="font-medium text-gray-900 dark:text-zinc-100">
          Check your inbox
        </p>
        <p className="text-sm text-gray-600 dark:text-zinc-400">
          We sent a sign-in link to{' '}
          <span className="font-medium text-gray-900 dark:text-zinc-100">
            {sentTo}
          </span>
          . It works once and expires in {SIGN_IN_LINK_MINUTES} minutes.
        </p>
        <Button
          variant="link"
          className="h-auto p-0"
          onClick={() => setSentTo(null)}
        >
          Use a different email
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <label
          htmlFor="sign-in-email"
          className="block text-sm font-medium text-gray-900 dark:text-zinc-100"
        >
          Email
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="sign-in-email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={!!error || undefined}
          />
          <Button type="submit" disabled={isSending}>
            {isSending && <Loader2 className="size-4 animate-spin" />}
            Email me a link
          </Button>
        </div>
      </form>

      {googleEnabled && (
        <>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-zinc-500">
            <span className="h-px flex-1 bg-gray-200 dark:bg-white/8" />
            or
            <span className="h-px flex-1 bg-gray-200 dark:bg-white/8" />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogle}
            disabled={isRedirecting}
          >
            {isRedirecting && <Loader2 className="size-4 animate-spin" />}
            Continue with Google
          </Button>
        </>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
