export default function Metric({
  label,
  value,
  hint,
}: {
  label: string
  value: number
  hint?: string
}) {
  return (
    <div>
      <dt className="text-sm text-gray-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-1 text-2xl font-semibold text-gray-900 tabular-nums dark:text-zinc-100">
        {value.toLocaleString()}
      </dd>
      {hint && (
        <dd className="mt-0.5 text-xs text-gray-400 dark:text-zinc-500">
          {hint}
        </dd>
      )}
    </div>
  )
}
