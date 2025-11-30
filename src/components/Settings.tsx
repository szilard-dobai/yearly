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
import {
  useSettings,
  type WeekStartsOn,
} from '@/lib/contexts/SettingsContext'

export default function Settings() {
  const { settings, actions } = useSettings()

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
          checked={settings.flagDisplayMode === 'icon'}
          onCheckedChange={(checked) =>
            actions.setFlagDisplayMode(checked ? 'icon' : 'emoji')
          }
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor="week-starts-on">Week starts on</Label>
        <Select
          value={settings.weekStartsOn.toString()}
          onValueChange={(value) =>
            actions.setWeekStartsOn(Number(value) as WeekStartsOn)
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

      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor="highlight-today">Highlight today</Label>
          <p className="text-sm text-muted-foreground">
            Show today&apos;s date in red on the calendar
          </p>
        </div>
        <Switch
          id="highlight-today"
          checked={settings.highlightToday}
          onCheckedChange={actions.setHighlightToday}
        />
      </div>
    </div>
  )
}
