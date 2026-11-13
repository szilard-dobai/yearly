'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { authClient } from '@/lib/auth/client'
import { SIGN_IN_CODE_MINUTES } from '@/lib/email/sign-in-code'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

interface SignInFormProps {
  googleEnabled: boolean
  next: string
}

interface AuthError {
  status?: number
  code?: string
}

const CODE_LENGTH = 6

function sendErrorMessage(error: AuthError) {
  return error.status === 429
    ? 'Too many codes requested. Try again in a few minutes.'
    : "We couldn't send the email. Check the address and try again."
}

function verifyErrorMessage(error: AuthError) {
  if (error.status === 429) {
    return 'Too many tries. Wait a few minutes, then send yourself a new code.'
  }
  switch (error.code) {
    case 'OTP_EXPIRED':
      return 'That code has expired. Send yourself a new one.'
    case 'TOO_MANY_ATTEMPTS':
      return 'Too many wrong tries. Send yourself a new code.'
    default:
      return "That code isn't right. Check the email and try again."
  }
}

export default function SignInForm({ googleEnabled, next }: SignInFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [isBusy, setIsBusy] = useState(false)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const [error, setError] = useState('')

  const sendCode = async (address: string) => {
    setError('')
    setIsBusy(true)
    const { error: sendError } = await authClient.emailOtp.sendVerificationOtp({
      email: address,
      type: 'sign-in',
    })
    setIsBusy(false)
    if (sendError) {
      setError(sendErrorMessage(sendError))
      return
    }
    setCode('')
    setSentTo(address)
  }

  const handleEmailSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    void sendCode(email.trim())
  }

  const handleCodeSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!sentTo) return
    setError('')
    setIsBusy(true)
    const { error: verifyError } = await authClient.signIn.emailOtp({
      email: sentTo,
      otp: code,
    })
    if (verifyError) {
      setIsBusy(false)
      setError(verifyErrorMessage(verifyError))
      return
    }
    router.replace(next)
    router.refresh()
  }

  const handleGoogle = async () => {
    setError('')
    setIsRedirecting(true)
    const { error: googleError } = await authClient.signIn.social({
      provider: 'google',
      callbackURL: next,
      errorCallbackURL: '/sign-in',
    })
    if (googleError) {
      setIsRedirecting(false)
      setError("Google sign-in didn't start. Try again, or use your email.")
    }
  }

  const errorMessage = error && (
    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
      {error}
    </p>
  )

  if (sentTo) {
    return (
      <form onSubmit={handleCodeSubmit} className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-zinc-400">
          We sent a {CODE_LENGTH}-digit code to{' '}
          <span className="font-medium break-all text-gray-900 dark:text-zinc-100">
            {sentTo}
          </span>
          . It expires in {SIGN_IN_CODE_MINUTES} minutes.
        </p>
        <div className="space-y-2">
          <label
            htmlFor="sign-in-code"
            className="block text-sm font-medium text-gray-900 dark:text-zinc-100"
          >
            Code
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              id="sign-in-code"
              required
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={CODE_LENGTH}
              placeholder="123456"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))
              }
              aria-invalid={!!error || undefined}
              className="font-mono tracking-[0.3em]"
            />
            <Button
              type="submit"
              disabled={isBusy || code.length !== CODE_LENGTH}
            >
              {isBusy && <Loader2 className="size-4 animate-spin" />}
              Sign in
            </Button>
          </div>
        </div>
        {errorMessage}
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            disabled={isBusy}
            onClick={() => void sendCode(sentTo)}
          >
            Send a new code
          </Button>
          <Button
            type="button"
            variant="link"
            className="h-auto p-0"
            onClick={() => {
              setError('')
              setSentTo(null)
            }}
          >
            Use a different email
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleEmailSubmit} className="space-y-2">
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
          <Button type="submit" disabled={isBusy}>
            {isBusy && <Loader2 className="size-4 animate-spin" />}
            Email me a code
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

      {errorMessage}
    </div>
  )
}
