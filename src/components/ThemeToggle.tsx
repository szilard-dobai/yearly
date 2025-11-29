'use client'

import { useSettings, type ColorScheme } from '@/lib/contexts/SettingsContext'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'

const THEME_CYCLE: ColorScheme[] = ['light', 'dark', 'system']

const THEME_CONFIG: Record<
  ColorScheme,
  { icon: typeof Sun; label: string }
> = {
  light: { icon: Sun, label: 'Light' },
  dark: { icon: Moon, label: 'Dark' },
  system: { icon: Monitor, label: 'System' },
}

export default function ThemeToggle() {
  const { settings, actions } = useSettings()

  const handleClick = () => {
    const currentIndex = THEME_CYCLE.indexOf(settings.colorScheme)
    const nextIndex = (currentIndex + 1) % THEME_CYCLE.length
    actions.setColorScheme(THEME_CYCLE[nextIndex])
  }

  const config = THEME_CONFIG[settings.colorScheme]
  const Icon = config.icon

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleClick}
      className="gap-2"
      aria-label={`Current theme: ${config.label}. Click to change.`}
    >
      <Icon className="size-4" />
      <span className="text-sm">{config.label}</span>
    </Button>
  )
}
