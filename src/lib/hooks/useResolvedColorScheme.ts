import { useSyncExternalStore } from 'react'
import { useSettings } from '@/lib/contexts/SettingsContext'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function subscribe(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function prefersDark() {
  return window.matchMedia(DARK_QUERY).matches
}

export function useResolvedColorScheme(): 'light' | 'dark' | null {
  const { settings, isLoaded } = useSettings()
  const systemDark = useSyncExternalStore(subscribe, prefersDark, () => false)

  if (!isLoaded) return null
  if (settings.colorScheme === 'system') return systemDark ? 'dark' : 'light'
  return settings.colorScheme
}
