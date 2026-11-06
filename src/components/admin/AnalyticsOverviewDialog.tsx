'use client'

import DeviceTypeIcon from '@/components/admin/DeviceTypeIcon'
import { EventToneDot } from '@/components/admin/EventTypeBadge'
import StatTile from '@/components/admin/StatTile'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getCountryName, getEventLabel } from '@/lib/admin/format'
import { getFlagEmoji } from '@/lib/countries'
import type { DeviceType } from '@/lib/tracking/types'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'

interface CountryDeviceCount {
  country: string
  deviceCount: number
}

export interface HighLevelStats {
  totalEvents: number
  uniqueCountries: number
  uniqueDevices: number
  totalVisitsAdded: number
  visitAttempts: {
    total: number
    successful: number
    failed: number
  }
  deviceTypePercentages: Record<DeviceType, number>
  deviceTypeCounts: Record<string, number>
  exports: {
    imageExportClicks: number
    statisticsExportClicks: number
    imageDownloadClicks: number
  }
  dataManagement: {
    jsonImports: number
    jsonExports: number
    calendarResets: number
  }
  pageViews: {
    homepage: number
    createPage: number
    notFound: number
  }
  eventBreakdown: Record<string, number>
  topCountriesByDevices: CountryDeviceCount[]
  interestingMentions: CountryDeviceCount[]
  travelCountries: CountryDeviceCount[]
}

const DEVICE_ROWS: { type: DeviceType; label: string; barClass: string }[] = [
  { type: 'mobile', label: 'Mobile', barClass: 'bg-sky-500' },
  { type: 'tablet', label: 'Tablet', barClass: 'bg-emerald-500' },
  { type: 'desktop', label: 'Desktop', barClass: 'bg-violet-500' },
]

function Panel({
  title,
  className,
  children,
}: {
  title: string
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-xl border border-gray-200 dark:border-white/8 bg-white dark:bg-[#141414] p-4',
        className
      )}
    >
      <h3 className="mb-3 text-sm text-gray-500 dark:text-zinc-400">{title}</h3>
      {children}
    </div>
  )
}

function CountRow({
  label,
  value,
  icon,
  title,
  labelClassName,
}: {
  label: string
  value: number
  icon?: ReactNode
  title?: string
  labelClassName?: string
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 text-sm"
      title={title}
    >
      <span
        className={cn(
          'flex min-w-0 items-center gap-2 text-gray-600 dark:text-zinc-400',
          labelClassName
        )}
      >
        {icon}
        <span className="truncate">{label}</span>
      </span>
      <span className="font-medium tabular-nums text-gray-900 dark:text-zinc-100">
        {value.toLocaleString()}
      </span>
    </div>
  )
}

function CountryList({ items }: { items: CountryDeviceCount[] }) {
  return (
    <ol className="space-y-2 text-sm">
      {items.slice(0, 5).map(({ country, deviceCount }, index) => (
        <li key={country} className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2 text-gray-900 dark:text-zinc-100">
            <span className="w-4 text-right text-gray-400 dark:text-zinc-500 tabular-nums">
              {index + 1}
            </span>
            <span>{getFlagEmoji(country)}</span>
            <span className="truncate">{getCountryName(country)}</span>
          </span>
          <span className="shrink-0 font-medium tabular-nums text-gray-900 dark:text-zinc-100">
            {deviceCount.toLocaleString()}{' '}
            <span className="font-normal text-gray-500 dark:text-zinc-500">
              {deviceCount === 1 ? 'device' : 'devices'}
            </span>
          </span>
        </li>
      ))}
    </ol>
  )
}

function OverviewContent({ stats }: { stats: HighLevelStats }) {
  return (
    <div className="min-w-0 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatTile
          label="Total events"
          value={stats.totalEvents.toLocaleString()}
        />
        <StatTile
          label="Unique devices"
          value={stats.uniqueDevices.toLocaleString()}
        />
        <StatTile
          label="Unique countries"
          value={stats.uniqueCountries.toLocaleString()}
        />
        <StatTile
          label="Travel days logged"
          value={stats.totalVisitsAdded.toLocaleString()}
        />
      </div>

      <Panel title="Device types">
        <div className="space-y-2">
          {DEVICE_ROWS.map(({ type, label, barClass }) => {
            const share = stats.deviceTypePercentages[type]
            return (
              <div key={type} className="flex items-center gap-3 text-sm">
                <span className="flex w-20 items-center gap-1.5 text-gray-700 dark:text-zinc-300">
                  <DeviceTypeIcon type={type} />
                  {label}
                </span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-white/8">
                  <span
                    className={cn('block h-full rounded-full', barClass)}
                    style={{ width: `${share}%` }}
                  />
                </span>
                <span className="w-14 text-right font-medium tabular-nums text-gray-900 dark:text-zinc-100">
                  {share.toFixed(1)}%
                </span>
              </div>
            )
          })}
        </div>
      </Panel>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Panel title="Visit attempts">
          <div className="space-y-2">
            <CountRow label="Total" value={stats.visitAttempts.total} />
            <CountRow
              label="Successful"
              value={stats.visitAttempts.successful}
              labelClassName="text-emerald-700 dark:text-emerald-400"
            />
            <CountRow
              label="Failed"
              value={stats.visitAttempts.failed}
              labelClassName="text-red-600 dark:text-red-400"
            />
          </div>
        </Panel>

        <Panel title="Exports">
          <div className="space-y-2">
            <CountRow
              label={getEventLabel('image_export_click')}
              value={stats.exports.imageExportClicks}
            />
            <CountRow
              label={getEventLabel('statistics_export_click')}
              value={stats.exports.statisticsExportClicks}
            />
            <CountRow
              label={getEventLabel('image_download_click')}
              value={stats.exports.imageDownloadClicks}
            />
          </div>
        </Panel>
      </div>

      {(stats.travelCountries.length > 0 ||
        stats.topCountriesByDevices.length > 0 ||
        stats.interestingMentions.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stats.travelCountries.length > 0 && (
            <Panel title="Countries travelled to">
              <CountryList items={stats.travelCountries} />
            </Panel>
          )}
          {stats.topCountriesByDevices.length > 0 && (
            <Panel title="Top countries by devices">
              <CountryList items={stats.topCountriesByDevices} />
            </Panel>
          )}
          {stats.interestingMentions.length > 0 && (
            <Panel title="Interesting mentions">
              <CountryList items={stats.interestingMentions} />
            </Panel>
          )}
        </div>
      )}

      <Panel title="Events by type">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {Object.entries(stats.eventBreakdown)
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => (
              <CountRow
                key={type}
                label={getEventLabel(type)}
                value={count}
                icon={<EventToneDot type={type} />}
                title={type}
              />
            ))}
        </div>
      </Panel>
    </div>
  )
}

export default function AnalyticsOverviewDialog({
  open,
  onOpenChange,
  stats,
  isLoading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  stats: HighLevelStats | null
  isLoading: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-3xl max-h-[88vh] overflow-y-auto bg-gray-50 dark:bg-[#0a0a0a] dark:border-white/8">
        <DialogHeader>
          <DialogTitle>Analytics overview</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-gray-400" />
          </div>
        ) : stats ? (
          <OverviewContent stats={stats} />
        ) : (
          <p className="py-8 text-center text-gray-500 dark:text-zinc-500">
            Failed to load stats
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
