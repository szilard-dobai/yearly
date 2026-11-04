'use client'

import { Pointer, X } from 'lucide-react'

interface CalendarHintProps {
  onDismiss: () => void
}

export default function CalendarHint({ onDismiss }: CalendarHintProps) {
  return (
    <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 py-3 ps-4 pe-2 text-sm text-gray-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-zinc-300">
      <span className="flex h-6 shrink-0 items-center">
        <Pointer className="size-4 text-red-500" />
      </span>
      <p className="flex-1 leading-6">
        <span className="font-medium text-gray-900 dark:text-zinc-100">
          <span className="pointer-coarse:hidden">Click</span>
          <span className="hidden pointer-coarse:inline">Tap</span> the first
          day of a trip
        </span>
        , then the last day, and pick the country.{' '}
        <span className="pointer-coarse:hidden">
          You can also drag across days.
        </span>
        <span className="hidden pointer-coarse:inline">
          Or press and hold, then drag.
        </span>
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss tip"
        className="-my-0.5 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-red-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-red-500/15 dark:hover:text-zinc-100"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
