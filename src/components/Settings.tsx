'use client'

import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DAYS_OF_WEEK } from '@/lib/constants'

export type FlagDisplayMode = 'emoji' | 'icon'
export type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6

interface SettingsProps {
  flagDisplayMode: FlagDisplayMode
  onFlagDisplayModeChange: (mode: FlagDisplayMode) => void
  weekStartsOn: WeekStartsOn
  onWeekStartsOnChange: (day: WeekStartsOn) => void
}

export default function Settings({
  flagDisplayMode,
  onFlagDisplayModeChange,
  weekStartsOn,
  onWeekStartsOnChange,
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

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="week-starts-on">Week starts on</Label>
        <Select
          value={weekStartsOn.toString()}
          onValueChange={(value) =>
            onWeekStartsOnChange(Number(value) as WeekStartsOn)
          }
        >
          <SelectTrigger id="week-starts-on">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DAYS_OF_WEEK.map((day) => (
              <SelectItem key={day.value} value={day.value.toString()}>
                {day.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
