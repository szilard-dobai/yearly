import * as React from 'react'
import { cn } from '@/lib/utils'
import { Card } from './card'

type CardVariantProps = React.ComponentProps<typeof Card>

export function StandardCard({ className, ...props }: CardVariantProps) {
  return (
    <Card
      className={cn('shadow-sm border border-gray-200 bg-white', className)}
      {...props}
    />
  )
}

export function DarkCard({ className, ...props }: CardVariantProps) {
  return (
    <Card
      className={cn('shadow-sm border-0 bg-black text-white', className)}
      {...props}
    />
  )
}

export function GradientCard({ className, ...props }: CardVariantProps) {
  return (
    <Card
      className={cn(
        'shadow-sm border border-gray-200 bg-linear-to-br from-gray-50 to-stone-50',
        className
      )}
      {...props}
    />
  )
}
