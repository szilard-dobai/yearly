import type { ReactNode } from 'react'

interface StatisticsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
}

export default function StatisticsCard({
  title,
  value,
  subtitle,
  icon,
}: StatisticsCardProps) {
  return (
    <div className="flex flex-col gap-2 p-4 rounded-lg border border-gray-200 dark:border-white/10 bg-linear-to-br from-gray-50 to-stone-50 dark:from-gray-950 dark:to-stone-950">
      <div className="flex items-center gap-2">
        {icon && <div className="text-gray-500 dark:text-gray-400">{icon}</div>}
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </h3>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold text-gray-900 dark:text-white">
          {value}
        </span>
        {subtitle && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  )
}
