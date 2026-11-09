import { PAGE_VIEW_EVENTS } from '@/lib/attribution/stats'
import type { Document } from 'mongodb'
import { DEVICE_TYPES, type DeviceType, type TrackingEventType } from './types'

export type FunnelStepKey =
  | 'arrived'
  | 'opened'
  | 'added'
  | 'exported'
  | 'downloaded'

export type FunnelStepDefinition = {
  key: FunnelStepKey
  label: string
  description: string
  events: readonly TrackingEventType[]
  successOnly?: boolean
}

export const FUNNEL_STEPS: readonly FunnelStepDefinition[] = [
  {
    key: 'arrived',
    label: 'Arrived',
    description: 'Viewed any page',
    events: PAGE_VIEW_EVENTS,
  },
  {
    key: 'opened',
    label: 'Opened the app',
    description: 'Loaded the create page',
    events: ['create_page_view'],
  },
  {
    key: 'added',
    label: 'Added a trip',
    description: 'Saved at least one country visit',
    events: ['visit_add_attempt'],
    successOnly: true,
  },
  {
    key: 'exported',
    label: 'Made an image',
    description: 'Generated a calendar, monthly or statistics image',
    events: [
      'image_export_click',
      'monthly_export_click',
      'statistics_export_click',
    ],
  },
  {
    key: 'downloaded',
    label: 'Downloaded',
    description: 'Downloaded or shared the image',
    events: ['image_download_click'],
  },
]

export type FunnelStep = { key: FunnelStepKey; devices: number }

export type FunnelSegment = 'all' | DeviceType

export type FunnelStats = Record<FunnelSegment, FunnelStep[]>

function stepQuery(step: FunnelStepDefinition): Document {
  return {
    type: { $in: [...step.events] },
    ...(step.successOnly && { 'metadata.success': true }),
  }
}

function reachedStep(step: FunnelStepDefinition): Document {
  const isStepEvent = { $in: ['$type', [...step.events]] }
  const condition = step.successOnly
    ? { $and: [isStepEvent, { $eq: ['$metadata.success', true] }] }
    : isStepEvent
  return { $max: { $cond: [condition, 1, 0] } }
}

export function buildFunnelPipeline(filters: Document = {}): Document[] {
  return [
    { $match: { ...filters, $or: FUNNEL_STEPS.map(stepQuery) } },
    {
      $group: {
        _id: '$deviceId',
        deviceType: {
          $max: {
            $cond: [
              { $in: ['$deviceType', [...DEVICE_TYPES]] },
              '$deviceType',
              null,
            ],
          },
        },
        ...Object.fromEntries(
          FUNNEL_STEPS.map((step) => [step.key, reachedStep(step)])
        ),
      },
    },
    {
      $group: {
        _id: '$deviceType',
        ...Object.fromEntries(
          FUNNEL_STEPS.map((step, index) => [
            step.key,
            {
              $sum: {
                $min: FUNNEL_STEPS.slice(0, index + 1).map(
                  ({ key }) => `$${key}`
                ),
              },
            },
          ])
        ),
      },
    },
  ]
}

function sumSteps(rows: Document[]): FunnelStep[] {
  return FUNNEL_STEPS.map(({ key }) => ({
    key,
    devices: rows.reduce(
      (total, row) => total + (typeof row[key] === 'number' ? row[key] : 0),
      0
    ),
  }))
}

export function buildFunnelStats(rows: Document[] = []): FunnelStats {
  const forType = (type: DeviceType) =>
    sumSteps(rows.filter((row) => row._id === type))
  return {
    all: sumSteps(rows),
    mobile: forType('mobile'),
    tablet: forType('tablet'),
    desktop: forType('desktop'),
  }
}

export function findBiggestDrop(steps: FunnelStep[]): FunnelStepKey | null {
  let biggest: { key: FunnelStepKey; lost: number } | null = null
  for (let index = 1; index < steps.length; index++) {
    const before = steps[index - 1].devices
    if (before === 0) continue
    const lost = (before - steps[index].devices) / before
    if (lost > 0 && (!biggest || lost > biggest.lost)) {
      biggest = { key: steps[index].key, lost }
    }
  }
  return biggest?.key ?? null
}
