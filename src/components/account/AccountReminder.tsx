'use client'

import { Button } from '@/components/ui/button'
import {
  createYearEndReminder,
  turnOffYearEndReminder,
} from '@/lib/reminders/client'
import { REMINDER_DATE_LABEL } from '@/lib/reminders/date'
import { forgetReminder, saveReminder } from '@/lib/reminders/storage'
import { useReminderStatus } from '@/lib/reminders/useReminderStatus'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

interface AccountReminderProps {
  year: number
  email: string
}

export default function AccountReminder({ year, email }: AccountReminderProps) {
  const [status, setStatus] = useReminderStatus(year, email)
  const [isSaving, setIsSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  const toggle = async (on: boolean) => {
    setIsSaving(true)
    setFailed(false)
    try {
      if (on) {
        await createYearEndReminder({ email, year })
        saveReminder(year, 'email')
      } else {
        await turnOffYearEndReminder(year)
        forgetReminder(year)
      }
      setStatus(on)
    } catch {
      setFailed(true)
    } finally {
      setIsSaving(false)
    }
  }

  if (status === null) {
    return (
      <p className="text-sm text-gray-500 dark:text-zinc-500">
        Checking your reminder…
      </p>
    )
  }

  if (status === 'error') {
    return (
      <p className="text-sm text-gray-600 dark:text-zinc-400">
        We couldn&apos;t load your reminder. Refresh the page to try again.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 dark:text-zinc-400" role="status">
        {status
          ? `We'll email you on ${REMINDER_DATE_LABEL}, when year-in-review season starts, to add your last trips and share your ${year}.`
          : `Get one email on ${REMINDER_DATE_LABEL}, when year-in-review season starts, to add your last trips and share your ${year}.`}
      </p>
      <Button
        variant="outline"
        onClick={() => toggle(!status)}
        disabled={isSaving}
      >
        {isSaving && <Loader2 className="size-4 animate-spin" />}
        {status ? 'Turn off' : 'Remind me'}
      </Button>
      {failed && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  )
}
