'use client'

import { Button } from '@/components/ui/button'
import { Check, Copy } from 'lucide-react'
import { type ReactNode, useEffect, useState } from 'react'

export default function CopyButton({
  value,
  label,
  children,
}: {
  value: string
  label: string
  children?: ReactNode
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timeout = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(timeout)
  }, [copied])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Button
      variant={children ? 'outline' : 'ghost'}
      size={children ? 'sm' : 'icon-sm'}
      onClick={handleCopy}
      aria-label={children ? undefined : label}
      title={children ? label : undefined}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {children}
    </Button>
  )
}
