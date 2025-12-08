'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { DAYS_OF_WEEK } from '@/lib/constants'
import { useSettings, type WeekStartsOn } from '@/lib/contexts/SettingsContext'
import { trackEvent } from '@/lib/tracking'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'

interface SettingsProps {
  year: number
  visitCount: number
  onReset: () => void
}

export default function Settings({ year, visitCount, onReset }: SettingsProps) {
  const { settings, actions } = useSettings()
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false)

  const handleReset = () => {
    trackEvent('calendar_reset', { year, visitCount })
    onReset()
    setIsResetDialogOpen(false)
  }

  return (
    <div className="space-y-4">
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

      <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
        <AlertDialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              className="w-full"
              disabled={visitCount === 0}
            >
              <Trash2 className="size-4" />
              Reset Calendar for {year}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent onOverlayClick={() => setIsResetDialogOpen(false)}>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset calendar for {year}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete all {visitCount} visit
                {visitCount !== 1 ? 's' : ''} from your {year} calendar. This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleReset}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                Reset Calendar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
