import {
  buildTrafficSourceStats,
  PAGE_VIEW_EVENTS,
  SURVEY_EVENTS,
  type TrafficSourceFacets,
} from '@/lib/attribution/stats'
import { getTrackingCollection } from '@/lib/mongodb'
import { requireAdmin } from '@/lib/tracking/api'
import type { Document } from 'mongodb'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const TOP_LIMIT = 15
const NOTES_LIMIT = 50

const nonEmptyString = { $type: 'string', $ne: '' }

function parseInstant(value: string | null): Date | null | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

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

  const url = new URL(request.url)
  const from = parseInstant(url.searchParams.get('from'))
  const to = parseInstant(url.searchParams.get('to'))
  if (from === null || to === null) {
    return NextResponse.json({ error: 'Invalid date range' }, { status: 400 })
  }
  const country = url.searchParams.get('country')
  const region = url.searchParams.get('region')

  const match: Document = {
    type: { $in: [...PAGE_VIEW_EVENTS, ...SURVEY_EVENTS] },
  }
  if (from || to) {
    match.timestamp = {
      ...(from && { $gte: from }),
      ...(to && { $lt: to }),
    }
  }
  if (country && country !== 'all') match.country = country
  if (region && region !== 'all') match.region = region

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
