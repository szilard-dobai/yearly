import { useSyncExternalStore } from 'react'
import { useSettings } from '@/lib/contexts/SettingsContext'

export const DARK_QUERY = '(prefers-color-scheme: dark)'

type ColorScheme = 'light' | 'dark'

function subscribe(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

function prefersDark() {
  return window.matchMedia(DARK_QUERY).matches
}

export function useSystemColorScheme(): ColorScheme {
  return useSyncExternalStore(subscribe, prefersDark, () => false)
    ? 'dark'
    : 'light'
}

export function useResolvedColorScheme(): ColorScheme | null {
  const { settings, isLoaded } = useSettings()
  const system = useSystemColorScheme()

  if (!isLoaded) return null
  if (settings.colorScheme === 'system') return system
  return settings.colorScheme
}
