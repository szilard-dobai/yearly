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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { BulkSendResult } from '@/lib/email/bulk-send'
import { Loader2, Mail, Send } from 'lucide-react'
import { type FormEvent, useId, useState } from 'react'

const ERROR_CLASSES =
  'rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400'

export type EmailSendCopy = {
  testUrl: string
  testTitle: string
  testDescription: string
  runUrl: string
  runLabel: string
  runTitle: string
  runDescription: string
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status})`)
  }
  return data as T
}

function SendTestButton({ copy }: { copy: EmailSendCopy }) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState('')
  const inputId = useId()

  const handleOpenChange = (nextOpen: boolean) => {
    if (status === 'sending') return
    setOpen(nextOpen)
    setStatus('idle')
    setError('')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setStatus('sending')
    setError('')
    try {
      await postJson(copy.testUrl, { email })
      setStatus('sent')
    } catch (sendError) {
      setStatus('idle')
      setError(
        sendError instanceof Error ? sendError.message : 'Failed to send'
      )
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="size-4" />
          Send a test
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md dark:border-white/8 dark:bg-[#141414]">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{copy.testTitle}</DialogTitle>
            <DialogDescription>{copy.testDescription}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor={inputId}>Email address</Label>
            <Input
              id={inputId}
              type="email"
              required
              autoComplete="off"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setStatus('idle')
              }}
            />
          </div>
          {error && (
            <p role="alert" className={ERROR_CLASSES}>
              {error}
            </p>
          )}
          {status === 'sent' && (
            <p role="status" className="text-sm text-emerald-600">
              Sent. Check that inbox.
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={status === 'sending'}>
              {status === 'sending' && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Send test
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function RunNowButton({
  copy,
  onFinished,
}: {
  copy: EmailSendCopy
  onFinished: (result: BulkSendResult) => void
}) {
  const [open, setOpen] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState('')

  const handleOpenChange = (nextOpen: boolean) => {
    if (isRunning) return
    setOpen(nextOpen)
    setError('')
  }

  const handleConfirm = async () => {
    setIsRunning(true)
    setError('')
    try {
      const result = await postJson<BulkSendResult>(copy.runUrl)
      setOpen(false)
      onFinished(result)
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Failed to send')
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button size="sm">
          <Send className="size-4" />
          {copy.runLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent
        onOverlayClick={() => handleOpenChange(false)}
        className="dark:border-white/8 dark:bg-[#141414]"
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.runTitle}</AlertDialogTitle>
          <AlertDialogDescription>{copy.runDescription}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className={ERROR_CLASSES}>
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isRunning}>Cancel</AlertDialogCancel>
          <Button onClick={handleConfirm} disabled={isRunning}>
            {isRunning && <Loader2 className="size-4 animate-spin" />}
            Send now
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function describeRun(result: BulkSendResult): string {
  return `Sent ${result.sentNow.toLocaleString()}, ${result.failed.toLocaleString()} failed, ${result.left.toLocaleString()} left.`
}

export default function EmailSendActions({
  copy,
  blocked,
  onRunFinished,
}: {
  copy: EmailSendCopy
  blocked: string | null
  onRunFinished: (result: BulkSendResult) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SendTestButton copy={copy} />
      {blocked ? (
        <p className="text-xs text-gray-500 dark:text-zinc-400">{blocked}</p>
      ) : (
        <RunNowButton copy={copy} onFinished={onRunFinished} />
      )}
    </div>
  )
}
