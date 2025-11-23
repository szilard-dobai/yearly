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
    <div className="flex flex-col gap-2 p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
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
