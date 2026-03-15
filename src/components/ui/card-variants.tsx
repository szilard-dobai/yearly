import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card } from './card'

type CardVariantProps = React.ComponentProps<typeof Card>

export function StandardCard({ className, ...props }: CardVariantProps) {
  return (
    <Card
      className={cn(
        'shadow-sm border border-gray-200 bg-white dark:border-white/8 dark:bg-[#141414]',
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
        'shadow-sm border-0 bg-black text-white dark:bg-[#1a1a1a] dark:text-white dark:border dark:border-white/8',
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
        'shadow-sm border border-gray-200 bg-linear-to-br from-gray-50 to-stone-50 dark:border-white/8 dark:from-[#111111] dark:to-[#141414]',
        className
      )}
      {...props}
    />
  )
}
