'use client'

import { useEffect, useRef } from 'react'

export const UNDO_TOAST_DURATION_MS = 5000

interface UndoToastProps {
  message: string
  onUndo?: () => void
  onDismiss: () => void
}

export default function UndoToast({
  message,
  onUndo,
  onDismiss,
}: UndoToastProps) {
  const dismissRef = useRef(onDismiss)

  useEffect(() => {
    dismissRef.current = onDismiss
  })

  useEffect(() => {
    const timer = setTimeout(() => dismissRef.current(), UNDO_TOAST_DURATION_MS)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      role="status"
      className="pointer-events-auto flex w-full items-center gap-3 rounded-xl bg-gray-900 py-2 ps-4 pe-2 text-sm text-white shadow-lg sm:max-w-md dark:bg-zinc-100 dark:text-gray-900"
    >
      <span className="min-w-0 flex-1 py-2">{message}</span>
      {onUndo && (
        <button
          type="button"
          onClick={onUndo}
          className="shrink-0 cursor-pointer rounded-lg px-3 py-2 font-semibold text-red-300 transition-colors hover:bg-white/10 dark:text-red-600 dark:hover:bg-black/8"
        >
          Undo
        </button>
      )}
    </div>
  )
}
