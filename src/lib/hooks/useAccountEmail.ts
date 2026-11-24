'use client'

import { authClient } from '@/lib/auth/client'
import { useEffect, useState } from 'react'

export function useAccountEmail(): string | null {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
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
  }, [])

  return email
}
