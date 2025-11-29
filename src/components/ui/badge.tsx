import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full text-xs font-medium',
  {
    variants: {
      variant: {
        default: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
        primary: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
        success:
          'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
        warning:
          'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
        destructive:
          'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200',
      },
      size: {
        sm: 'px-1.5 py-0.5 text-[10px]',
        default: 'px-2 py-0.5',
        lg: 'px-2.5 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
