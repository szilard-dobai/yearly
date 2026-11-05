import type { ReactNode } from 'react'

export default function StatTile({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
}) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#141414] p-4">
      <p className="text-sm text-gray-500 dark:text-zinc-400">{label}</p>
      <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-zinc-100">
        {value}
      </div>
      {hint && (
        <p className="mt-0.5 text-xs text-gray-400 dark:text-zinc-500">
          {hint}
        </p>
      )}
    </div>
  )
}
