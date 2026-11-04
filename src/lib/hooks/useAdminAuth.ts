'use client'

import { useCallback, useEffect, useState } from 'react'

export type AdminAuthStatus = 'checking' | 'authenticated' | 'unauthenticated'

export function useAdminAuth() {
  const [status, setStatus] = useState<AdminAuthStatus>('checking')

  useEffect(() => {
    let cancelled = false

    fetch('/api/admin/auth')
      .then((response) =>
        response.ok ? response.json() : { authenticated: false }
      )
      .then((data: { authenticated?: boolean }) => {
        if (!cancelled) {
          setStatus(data.authenticated ? 'authenticated' : 'unauthenticated')
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('unauthenticated')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (password: string) => {
    try {
      const response = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (response.ok) {
        setStatus('authenticated')
        return null
      }

      const data = await response.json().catch(() => ({}))
      return (data.error as string | undefined) || 'Invalid password'
    } catch {
      return 'Authentication failed'
    }
  }, [])

  const logout = useCallback(async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' }).catch(() => {})
    setStatus('unauthenticated')
  }, [])

  const markUnauthenticated = useCallback(() => {
    setStatus('unauthenticated')
  }, [])

  return {
    status,
    isAuthenticated: status === 'authenticated',
    login,
    logout,
    markUnauthenticated,
  }
}
