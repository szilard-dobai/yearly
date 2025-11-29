'use client'

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react'

export type FlagDisplayMode = 'emoji' | 'icon'
export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type ColorScheme = 'light' | 'dark' | 'system'

export interface Settings {
  flagDisplayMode: FlagDisplayMode
  weekStartsOn: WeekStartsOn
  colorScheme: ColorScheme
}

const SETTINGS_STORAGE_KEY = 'countries-in-year-settings'

const DEFAULT_SETTINGS: Settings = {
  flagDisplayMode: 'emoji',
  weekStartsOn: 0,
  colorScheme: 'system',
}

function saveSettingsToStorage(settings: Settings): void {
  try {
    const json = JSON.stringify(settings)
    localStorage.setItem(SETTINGS_STORAGE_KEY, json)
  } catch (error) {
    console.error('Failed to save settings:', error)
  }
}

function loadSettingsFromStorage(): Settings {
  try {
    const json = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!json) return DEFAULT_SETTINGS

    const parsed = JSON.parse(json)

    return {
      flagDisplayMode: parsed.flagDisplayMode || DEFAULT_SETTINGS.flagDisplayMode,
      weekStartsOn:
        typeof parsed.weekStartsOn === 'number'
          ? parsed.weekStartsOn
          : DEFAULT_SETTINGS.weekStartsOn,
      colorScheme: parsed.colorScheme || DEFAULT_SETTINGS.colorScheme,
    }
  } catch (error) {
    console.error('Failed to load settings:', error)
    return DEFAULT_SETTINGS
  }
}

export function clearSettings(): void {
  try {
    localStorage.removeItem(SETTINGS_STORAGE_KEY)
  } catch (error) {
    console.error('Failed to clear settings:', error)
  }
}

type SettingsAction =
  | { type: 'SET_FLAG_DISPLAY_MODE'; payload: FlagDisplayMode }
  | { type: 'SET_WEEK_STARTS_ON'; payload: WeekStartsOn }
  | { type: 'SET_COLOR_SCHEME'; payload: ColorScheme }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'RESET_SETTINGS' }
  | { type: 'LOAD_SETTINGS'; payload: Settings }

function settingsReducer(state: Settings, action: SettingsAction): Settings {
  switch (action.type) {
    case 'SET_FLAG_DISPLAY_MODE':
      return { ...state, flagDisplayMode: action.payload }
    case 'SET_WEEK_STARTS_ON':
      return { ...state, weekStartsOn: action.payload }
    case 'SET_COLOR_SCHEME':
      return { ...state, colorScheme: action.payload }
    case 'UPDATE_SETTINGS':
      return { ...state, ...action.payload }
    case 'RESET_SETTINGS':
      return DEFAULT_SETTINGS
    case 'LOAD_SETTINGS':
      return action.payload
    default:
      return state
  }
}

interface SettingsActions {
  setFlagDisplayMode: (mode: FlagDisplayMode) => void
  setWeekStartsOn: (day: WeekStartsOn) => void
  setColorScheme: (scheme: ColorScheme) => void
  updateSettings: (updates: Partial<Settings>) => void
  resetSettings: () => void
}

interface SettingsContextValue {
  settings: Settings
  actions: SettingsActions
  isLoaded: boolean
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

interface SettingsProviderProps {
  children: ReactNode
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, dispatch] = useReducer(settingsReducer, DEFAULT_SETTINGS)
  const [isLoaded, setIsLoaded] = React.useState(false)

  useEffect(() => {
    const stored = loadSettingsFromStorage()
    dispatch({ type: 'LOAD_SETTINGS', payload: stored })
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    if (isLoaded) {
      saveSettingsToStorage(settings)
    }
  }, [settings, isLoaded])

  useEffect(() => {
    if (!isLoaded) return

    const root = document.documentElement

    if (settings.colorScheme === 'system') {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches
      root.classList.toggle('dark', prefersDark)
    } else {
      root.classList.toggle('dark', settings.colorScheme === 'dark')
    }
  }, [settings.colorScheme, isLoaded])

  useEffect(() => {
    if (!isLoaded || settings.colorScheme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      document.documentElement.classList.toggle('dark', e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [settings.colorScheme, isLoaded])

  const actions = useMemo<SettingsActions>(
    () => ({
      setFlagDisplayMode: (mode) =>
        dispatch({ type: 'SET_FLAG_DISPLAY_MODE', payload: mode }),
      setWeekStartsOn: (day) =>
        dispatch({ type: 'SET_WEEK_STARTS_ON', payload: day }),
      setColorScheme: (scheme) =>
        dispatch({ type: 'SET_COLOR_SCHEME', payload: scheme }),
      updateSettings: (updates) =>
        dispatch({ type: 'UPDATE_SETTINGS', payload: updates }),
      resetSettings: () => dispatch({ type: 'RESET_SETTINGS' }),
    }),
    []
  )

  return (
    <SettingsContext.Provider value={{ settings, actions, isLoaded }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider')
  }
  return context
}
