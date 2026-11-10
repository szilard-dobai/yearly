import { cn } from '@/lib/utils'
import type { ComponentProps } from 'react'

interface ChoiceChipProps extends ComponentProps<'button'> {
  selected?: boolean
}

export default function ChoiceChip({
  selected = false,
  className,
  ...props
}: ChoiceChipProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex cursor-pointer items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        selected
          ? 'border-gray-900 bg-gray-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-gray-900'
          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-100 dark:border-white/8 dark:bg-[#141414] dark:text-zinc-300 dark:hover:bg-[#222222]',
        className
      )}
      {...props}
    />
  )
}
