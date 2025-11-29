import * as React from 'react'
import { Button } from '@/components/ui/button'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import type { StatusState } from '@/lib/hooks/useStatusFeedback'

interface StatusConfig {
  icon: React.ReactNode
  text: string
}

interface StatusButtonProps
  extends Omit<React.ComponentProps<typeof Button>, 'children'> {
  status: StatusState
  idleIcon: React.ReactNode
  idleText: string
  successText?: string
  errorText?: string
  loadingText?: string
  iconSize?: string
}

export function StatusButton({
  status,
  idleIcon,
  idleText,
  successText = 'Done!',
  errorText = 'Failed',
  loadingText = 'Loading...',
  iconSize = 'size-4',
  variant,
  disabled,
  ...props
}: StatusButtonProps) {
  const configs: Record<StatusState, StatusConfig> = {
    idle: { icon: idleIcon, text: idleText },
    loading: {
      icon: <Loader2 className={`${iconSize} animate-spin`} />,
      text: loadingText,
    },
    success: {
      icon: <CheckCircle2 className={iconSize} />,
      text: successText,
    },
    error: { icon: <XCircle className={iconSize} />, text: errorText },
  }

  const config = configs[status]

  const computedVariant =
    status === 'error' ? 'destructive' : (variant ?? 'default')

  return (
    <Button
      variant={computedVariant}
      disabled={disabled || status !== 'idle'}
      {...props}
    >
      {config.icon}
      {config.text}
    </Button>
  )
}
