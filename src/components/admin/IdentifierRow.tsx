import CopyButton from '@/components/admin/CopyButton'
import type { ReactNode } from 'react'

export default function IdentifierRow({
  label,
  value,
  action,
}: {
  label: string
  value: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1">
        <span className="w-16 shrink-0 text-xs text-gray-500 dark:text-zinc-500">
          {label}
        </span>
        <code className="truncate rounded bg-gray-100 dark:bg-white/8 px-1.5 py-0.5 text-xs text-gray-600 dark:text-zinc-400">
          {value}
        </code>
        <CopyButton value={value} label={`Copy ${label.toLowerCase()}`} />
      </div>
      {action}
    </div>
  )
}
