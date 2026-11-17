'use client'

import { useAccountsEnabled } from '@/components/account/AccountsEnabledProvider'
import { authClient } from '@/lib/auth/client'
import { useEffect, useState } from 'react'

export function useAccountEmail(): string | null {
  const enabled = useAccountsEnabled()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    authClient
      .getSession()
      .then(({ data }) => {
        if (!cancelled) setEmail(data?.user.email ?? null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [enabled])

  return email
}
