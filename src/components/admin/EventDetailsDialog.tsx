'use client'

import ConfirmDeleteButton from '@/components/admin/ConfirmDeleteButton'
import CountryFlag from '@/components/admin/CountryFlag'
import DetailRow from '@/components/admin/DetailRow'
import DeviceTypeIcon from '@/components/admin/DeviceTypeIcon'
import { EventGroupDot } from '@/components/admin/EventTypeBadge'
import IdentifierRow from '@/components/admin/IdentifierRow'
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
  shortId,
} from '@/lib/admin/format'
import type { StoredTrackingEvent } from '@/lib/tracking/types'
import { Filter } from 'lucide-react'

interface EventDetailsDialogProps {
  event: StoredTrackingEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  idFilter: string
  onFilterById: (id: string) => void
  onDeleteEvent: (event: StoredTrackingEvent) => Promise<void>
  onDeleteDevice: (deviceId: string) => Promise<void>
}

export default function EventDetailsDialog({
  event,
  open,
  onOpenChange,
  idFilter,
  onFilterById,
  onDeleteEvent,
  onDeleteDevice,
}: EventDetailsDialogProps) {
  const metadata = event?.metadata
  const userId = event?.userId
  const hasMetadata = !!metadata && Object.keys(metadata).length > 0

  return (
    <Dialog open={open && event !== null} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[88vh] overflow-y-auto bg-gray-50 dark:bg-[#0a0a0a] dark:border-white/8">
        {event && (
          <div className="min-w-0 space-y-6">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-center gap-2 sm:justify-start">
                <EventGroupDot type={event.type} className="size-2.5" />
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
              <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-white/8">
                <IdentifierRow
                  label="Device ID"
                  value={event.deviceId}
                  action={
                    idFilter !== event.deviceId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onFilterById(event.deviceId)}
                      >
                        <Filter className="size-4" />
                        Show this device only
                      </Button>
                    )
                  }
                />
                {userId && (
                  <IdentifierRow
                    label="User ID"
                    value={userId}
                    action={
                      idFilter !== userId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onFilterById(userId)}
                        >
                          <Filter className="size-4" />
                          Show this user only
                        </Button>
                      )
                    }
                  />
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
                description={`Every tracking event and feedback entry from device ${shortId(event.deviceId)} will be permanently deleted and removed from the stats.`}
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
