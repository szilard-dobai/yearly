'use client'

import { Label } from '@/app/components/ui/label'
import { Switch } from '@/app/components/ui/switch'

export type FlagDisplayMode = 'emoji' | 'icon'

interface SettingsProps {
  flagDisplayMode: FlagDisplayMode
  onFlagDisplayModeChange: (mode: FlagDisplayMode) => void
}

export default function Settings({
  flagDisplayMode,
  onFlagDisplayModeChange,
}: SettingsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor="flag-display-mode">Use flag icons</Label>
          <p className="text-sm text-muted-foreground">
            Display country flags as icons instead of emoji
          </p>
        </div>
        <Switch
          id="flag-display-mode"
          checked={flagDisplayMode === 'icon'}
          onCheckedChange={(checked) =>
            onFlagDisplayModeChange(checked ? 'icon' : 'emoji')
          }
        />
      </div>
    </div>
  )
}
