import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card } from './card'

type CardVariantProps = React.ComponentProps<typeof Card>

export function StandardCard({ className, ...props }: CardVariantProps) {
  return (
    <Card
      className={cn(
        'shadow-sm border border-gray-200 dark:border-white/10 bg-white dark:bg-black',
        className
      )}
      {...props}
    />
  )
}

export function DarkCard({ className, ...props }: CardVariantProps) {
  return (
    <Card
      className={cn(
        'shadow-sm border-0 bg-black text-white dark:bg-white dark:text-black',
        className
      )}
      {...props}
    />
  )
}

export function GradientCard({ className, ...props }: CardVariantProps) {
  return (
    <Card
      className={cn(
        'shadow-sm border border-gray-200 dark:border-white/10 bg-linear-to-br from-gray-50 to-stone-50 dark:from-gray-950 dark:to-stone-950',
        className
      )}
      {...props}
    />
  )
}
