'use client'

import { Button } from '@/components/ui/button'
import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function CopyButton({
  value,
  label,
}: {
  value: string
  label: string
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
      variant="ghost"
      size="icon-sm"
      onClick={handleCopy}
      aria-label={label}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
    </Button>
  )
}
