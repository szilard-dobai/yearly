'use client'

import ConfirmDeleteButton from '@/components/admin/ConfirmDeleteButton'
import CopyButton from '@/components/admin/CopyButton'
import CountryFlag from '@/components/admin/CountryFlag'
import DetailRow from '@/components/admin/DetailRow'
import DeviceTypeIcon from '@/components/admin/DeviceTypeIcon'
import { EventToneDot } from '@/components/admin/EventTypeBadge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  formatDateTime,
  formatLocation,
  getEventLabel,
  shortDeviceId,
} from '@/lib/admin/format'
import type { StoredTrackingEvent } from '@/lib/tracking/types'
import { Filter } from 'lucide-react'

interface EventDetailsDialogProps {
  event: StoredTrackingEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  isDeviceFiltered: boolean
  onShowDeviceEvents: (deviceId: string) => void
  onDeleteEvent: (event: StoredTrackingEvent) => Promise<void>
  onDeleteDevice: (deviceId: string) => Promise<void>
}

export default function EventDetailsDialog({
  event,
  open,
  onOpenChange,
  isDeviceFiltered,
  onShowDeviceEvents,
  onDeleteEvent,
  onDeleteDevice,
}: EventDetailsDialogProps) {
  const metadata = event?.metadata
  const hasMetadata = !!metadata && Object.keys(metadata).length > 0

  return (
    <Dialog open={open && event !== null} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[88vh] overflow-y-auto bg-gray-50 dark:bg-[#0a0a0a] dark:border-white/8">
        {event && (
          <div className="min-w-0 space-y-6">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-center gap-2 sm:justify-start">
                <EventToneDot type={event.type} className="size-2.5" />
                {getEventLabel(event.type)}
              </DialogTitle>
              <DialogDescription className="font-mono text-xs">
                {event.type}
              </DialogDescription>
            </DialogHeader>

            <section className="rounded-xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#141414] p-4 space-y-4">
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="col-span-2 md:col-span-1">
                  <DetailRow
                    label="Time"
                    value={formatDateTime(event.timestamp, 'seconds')}
                  />
                </div>
                <DetailRow
                  label="Device"
                  value={event.deviceType ?? 'Unknown'}
                  icon={<DeviceTypeIcon type={event.deviceType} />}
                />
                <DetailRow
                  label="Location"
                  value={formatLocation(event.country, event.region)}
                  icon={event.country && <CountryFlag code={event.country} />}
                />
              </dl>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-white/8">
                <div className="flex min-w-0 items-center gap-1">
                  <code className="truncate rounded bg-gray-100 dark:bg-white/8 px-1.5 py-0.5 text-xs text-gray-600 dark:text-zinc-400">
                    {event.deviceId}
                  </code>
                  <CopyButton value={event.deviceId} label="Copy device id" />
                </div>
                {!isDeviceFiltered && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onShowDeviceEvents(event.deviceId)}
                  >
                    <Filter className="size-4" />
                    Show this device only
                  </Button>
                )}
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="font-semibold text-gray-900 dark:text-zinc-100">
                Metadata
              </h3>
              {hasMetadata ? (
                <pre className="max-h-[50vh] overflow-auto rounded-xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#141414] p-4 text-xs leading-relaxed text-gray-800 dark:text-zinc-200">
                  {JSON.stringify(metadata, null, 2)}
                </pre>
              ) : (
                <p className="text-sm italic text-gray-500 dark:text-zinc-500">
                  No metadata
                </p>
              )}
            </section>

            <div className="flex flex-wrap justify-end gap-2 pt-4 border-t border-gray-200 dark:border-white/8">
              <ConfirmDeleteButton
                label="Delete all from this device"
                title="Delete all activity from this device?"
                description={`Every tracking event and feedback entry from device ${shortDeviceId(event.deviceId)} will be permanently deleted and removed from the stats.`}
                confirmLabel="Delete device activity"
                onConfirm={() => onDeleteDevice(event.deviceId)}
              />
              <ConfirmDeleteButton
                label="Delete event"
                title="Delete this event?"
                description={`The "${getEventLabel(event.type)}" event from ${formatDateTime(event.timestamp, 'seconds')} will be permanently deleted and removed from the stats.`}
                confirmLabel="Delete event"
                onConfirm={() => onDeleteEvent(event)}
              />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
