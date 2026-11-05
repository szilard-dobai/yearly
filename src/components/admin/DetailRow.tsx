import type { ReactNode } from 'react'

export default function DetailRow({
  label,
  value,
  icon,
}: {
  label: string
  value: string
  icon?: ReactNode
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-500 dark:text-zinc-500">{label}</dt>
      <dd
        className="flex items-center gap-1.5 text-sm text-gray-900 dark:text-zinc-100"
        title={value}
      >
        {icon}
        <span className="min-w-0 truncate">{value}</span>
      </dd>
    </div>
  )
}
