'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'

export type FlagDisplayMode = 'emoji' | 'icon'
export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6
export type ColorScheme = 'light' | 'dark' | 'system'

export interface Settings {
  flagDisplayMode: FlagDisplayMode
  weekStartsOn: WeekStartsOn
  colorScheme: ColorScheme
  highlightToday: boolean
}

const SETTINGS_STORAGE_KEY = 'countries-in-year-settings'

const DEFAULT_SETTINGS: Settings = {
  flagDisplayMode: 'emoji',
  weekStartsOn: 0,
  colorScheme: 'system',
  highlightToday: true,
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
      flagDisplayMode:
        parsed.flagDisplayMode || DEFAULT_SETTINGS.flagDisplayMode,
      weekStartsOn:
        typeof parsed.weekStartsOn === 'number'
          ? parsed.weekStartsOn
          : DEFAULT_SETTINGS.weekStartsOn,
      colorScheme: parsed.colorScheme || DEFAULT_SETTINGS.colorScheme,
      highlightToday: parsed.highlightToday ?? DEFAULT_SETTINGS.highlightToday,
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

interface SettingsState {
  settings: Settings
  isLoaded: boolean
}

const DEFAULT_STATE: SettingsState = {
  settings: DEFAULT_SETTINGS,
  isLoaded: false,
}

type SettingsAction =
  | { type: 'SET_FLAG_DISPLAY_MODE'; payload: FlagDisplayMode }
  | { type: 'SET_WEEK_STARTS_ON'; payload: WeekStartsOn }
  | { type: 'SET_COLOR_SCHEME'; payload: ColorScheme }
  | { type: 'SET_HIGHLIGHT_TODAY'; payload: boolean }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<Settings> }
  | { type: 'RESET_SETTINGS' }
  | { type: 'LOAD_SETTINGS'; payload: Settings }

function settingsReducer(
  state: SettingsState,
  action: SettingsAction
): SettingsState {
  switch (action.type) {
    case 'SET_FLAG_DISPLAY_MODE':
      return {
        ...state,
        settings: { ...state.settings, flagDisplayMode: action.payload },
      }
    case 'SET_WEEK_STARTS_ON':
      return {
        ...state,
        settings: { ...state.settings, weekStartsOn: action.payload },
      }
    case 'SET_COLOR_SCHEME':
      return {
        ...state,
        settings: { ...state.settings, colorScheme: action.payload },
      }
    case 'SET_HIGHLIGHT_TODAY':
      return {
        ...state,
        settings: { ...state.settings, highlightToday: action.payload },
      }
    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      }
    case 'RESET_SETTINGS':
      return { ...state, settings: DEFAULT_SETTINGS }
    case 'LOAD_SETTINGS':
      return { settings: action.payload, isLoaded: true }
    default:
      return state
  }
}

interface SettingsActions {
  setFlagDisplayMode: (mode: FlagDisplayMode) => void
  setWeekStartsOn: (day: WeekStartsOn) => void
  setColorScheme: (scheme: ColorScheme) => void
  setHighlightToday: (highlight: boolean) => void
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
  const [state, dispatch] = useReducer(settingsReducer, DEFAULT_STATE)
  const { settings, isLoaded } = state

  useEffect(() => {
    const stored = loadSettingsFromStorage()
    dispatch({ type: 'LOAD_SETTINGS', payload: stored })
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
      setHighlightToday: (highlight) =>
        dispatch({ type: 'SET_HIGHLIGHT_TODAY', payload: highlight }),
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
