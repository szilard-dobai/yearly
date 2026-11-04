'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

interface AdminLoginFormProps {
  onLogin: (password: string) => Promise<string | null>
}

export default function AdminLoginForm({ onLogin }: AdminLoginFormProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    const loginError = await onLogin(password)
    if (loginError) {
      setError(loginError)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 p-6 border rounded-lg bg-white dark:bg-gray-900 shadow-lg"
      >
        <h1 className="text-xl font-semibold text-center">Admin Access</h1>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter admin password"
            autoFocus
          />
        </div>
        {error && <p className="text-sm text-red-500 text-center">{error}</p>}
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            'Sign In'
          )}
        </Button>
      </form>
    </div>
  )
}
