import { toDayKey } from '@/lib/selection'
import { useSyncExternalStore } from 'react'

function subscribe() {
  return () => {}
}

export function useTodayKey(today?: Date): string | null {
  const local = useSyncExternalStore(
    subscribe,
    () => toDayKey(new Date()),
    () => null
  )
  return today ? toDayKey(today) : local
}
