'use client'

export default function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-full bg-gray-200/70 p-0.5 text-xs font-medium dark:bg-white/8"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className="cursor-pointer rounded-full px-3 py-1.5 text-gray-600 transition-colors hover:text-gray-900 aria-checked:bg-white aria-checked:text-gray-900 aria-checked:shadow-sm dark:text-zinc-400 dark:hover:text-zinc-100 dark:aria-checked:bg-zinc-100 dark:aria-checked:text-gray-900"
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
