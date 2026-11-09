import {
  buildTrafficSourceStats,
  PAGE_VIEW_EVENTS,
  SURVEY_EVENTS,
  type TrafficSourceFacets,
} from '@/lib/attribution/stats'
import { parseStatsFilters } from '@/lib/admin/stats-filters'
import { getTrackingCollection } from '@/lib/mongodb'
import { requireAdmin } from '@/lib/tracking/api'
import type { Document } from 'mongodb'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const TOP_LIMIT = 15
const NOTES_LIMIT = 50

const nonEmptyString = { $type: 'string', $ne: '' }

function countDevices(match: Document): Document[] {
  return [
    { $match: match },
    { $group: { _id: '$deviceId' } },
    { $count: 'devices' },
  ]
}

function countDevicesBy(
  types: readonly string[],
  field: string,
  key: unknown = `$${field}`
): Document[] {
  return [
    { $match: { type: { $in: types }, [field]: nonEmptyString } },
    { $group: { _id: key, devices: { $addToSet: '$deviceId' } } },
    { $project: { _id: 0, label: '$_id', devices: { $size: '$devices' } } },
    { $sort: { devices: -1, label: 1 } },
    { $limit: TOP_LIMIT },
  ]
}

export async function GET(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  const filters = parseStatsFilters(new URL(request.url).searchParams)
  if (!filters) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  }

  const match: Document = {
    type: { $in: [...PAGE_VIEW_EVENTS, ...SURVEY_EVENTS] },
    ...filters,
  }

  const pageViews = { $in: PAGE_VIEW_EVENTS }

  try {
    const collection = await getTrackingCollection()
    const [facets] = await collection
      .aggregate<TrafficSourceFacets>([
        { $match: match },
        {
          $facet: {
            trackedDevices: countDevices({
              type: pageViews,
              'metadata.userAgent': nonEmptyString,
            }),
            attributedDevices: countDevices({
              type: pageViews,
              $or: [
                { 'metadata.referrer': nonEmptyString },
                { 'metadata.utm': { $type: 'object' } },
                { 'metadata.inAppBrowser': nonEmptyString },
              ],
            }),
            referrers: countDevicesBy(PAGE_VIEW_EVENTS, 'metadata.referrer', {
              $arrayElemAt: [{ $split: ['$metadata.referrer', '/'] }, 2],
            }),
            inAppBrowsers: countDevicesBy(
              PAGE_VIEW_EVENTS,
              'metadata.inAppBrowser'
            ),
            utmSource: countDevicesBy(PAGE_VIEW_EVENTS, 'metadata.utm.source'),
            utmMedium: countDevicesBy(PAGE_VIEW_EVENTS, 'metadata.utm.medium'),
            utmCampaign: countDevicesBy(
              PAGE_VIEW_EVENTS,
              'metadata.utm.campaign'
            ),
            surveyFunnel: [
              { $match: { type: { $in: SURVEY_EVENTS } } },
              { $group: { _id: '$type', devices: { $addToSet: '$deviceId' } } },
              {
                $project: {
                  _id: 0,
                  type: '$_id',
                  devices: { $size: '$devices' },
                },
              },
            ],
            surveyAnswers: countDevicesBy(
              ['acquisition_survey_answered'],
              'metadata.answer'
            ),
            surveyNotes: [
              {
                $match: {
                  type: 'acquisition_survey_answered',
                  'metadata.otherText': nonEmptyString,
                },
              },
              { $sort: { timestamp: -1 } },
              { $limit: NOTES_LIMIT },
              {
                $project: {
                  _id: 0,
                  text: '$metadata.otherText',
                  timestamp: 1,
                  country: 1,
                },
              },
            ],
          },
        },
      ])
      .toArray()

    return NextResponse.json(buildTrafficSourceStats(facets))
  } catch (error) {
    console.error('Failed to fetch traffic source stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch traffic source stats' },
      { status: 500 }
    )
  }
}
