import { getTrackingCollection } from '@/lib/mongodb'
import { isAuthenticated, validateSameOrigin } from '@/lib/tracking/api'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface VisitAddAttemptMetadata {
  success: boolean
  dateCount?: number
}

export async function GET(request: Request) {
  const forbidden = validateSameOrigin(request)
  if (forbidden) return forbidden

  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const collection = await getTrackingCollection()

    const [
      totalEvents,
      uniqueCountries,
      uniqueDevices,
      deviceTypeCounts,
      imageExportClicks,
      statisticsExportClicks,
      imageDownloadClicks,
      visitAddAttempts,
      jsonImports,
      jsonExports,
      calendarResets,
      pageViews,
      eventTypeBreakdown,
    ] = await Promise.all([
      collection.countDocuments({}),
      collection.distinct('country').then((arr) => arr.filter(Boolean).length),
      collection.distinct('deviceId').then((arr) => arr.length),
      collection
        .aggregate([
          { $match: { deviceType: { $exists: true, $ne: null } } },
          { $group: { _id: '$deviceType', count: { $sum: 1 } } },
        ])
        .toArray(),
      collection.countDocuments({ type: 'image_export_click' }),
      collection.countDocuments({ type: 'statistics_export_click' }),
      collection.countDocuments({ type: 'image_download_click' }),
      collection.find({ type: 'visit_add_attempt' }).toArray(),
      collection.countDocuments({ type: 'json_import' }),
      collection.countDocuments({ type: 'json_export' }),
      collection.countDocuments({ type: 'calendar_reset' }),
      collection
        .aggregate([
          {
            $match: {
              type: { $in: ['homepage_view', 'create_page_view', 'not_found_page_view'] },
            },
          },
          { $group: { _id: '$type', count: { $sum: 1 } } },
        ])
        .toArray(),
      collection
        .aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }])
        .toArray(),
    ])

    const totalVisitsAdded = visitAddAttempts.reduce((sum, event) => {
      const metadata = event.metadata as VisitAddAttemptMetadata | undefined
      if (metadata?.success && metadata?.dateCount) {
        return sum + metadata.dateCount
      }
      return sum
    }, 0)

    const successfulVisitAttempts = visitAddAttempts.filter(
      (e) => (e.metadata as VisitAddAttemptMetadata | undefined)?.success
    ).length
    const failedVisitAttempts = visitAddAttempts.length - successfulVisitAttempts

    const deviceTypeMap: Record<string, number> = {}
    let totalWithDeviceType = 0
    for (const item of deviceTypeCounts) {
      deviceTypeMap[item._id as string] = item.count as number
      totalWithDeviceType += item.count as number
    }

    const deviceTypePercentages = {
      mobile: totalWithDeviceType > 0 ? ((deviceTypeMap['mobile'] || 0) / totalWithDeviceType) * 100 : 0,
      tablet: totalWithDeviceType > 0 ? ((deviceTypeMap['tablet'] || 0) / totalWithDeviceType) * 100 : 0,
      desktop: totalWithDeviceType > 0 ? ((deviceTypeMap['desktop'] || 0) / totalWithDeviceType) * 100 : 0,
    }

    const pageViewMap: Record<string, number> = {}
    for (const item of pageViews) {
      pageViewMap[item._id as string] = item.count as number
    }

    const eventBreakdown: Record<string, number> = {}
    for (const item of eventTypeBreakdown) {
      eventBreakdown[item._id as string] = item.count as number
    }

    return NextResponse.json({
      totalEvents,
      uniqueCountries,
      uniqueDevices,
      totalVisitsAdded,
      visitAttempts: {
        total: visitAddAttempts.length,
        successful: successfulVisitAttempts,
        failed: failedVisitAttempts,
      },
      deviceTypePercentages,
      deviceTypeCounts: deviceTypeMap,
      exports: {
        imageExportClicks,
        statisticsExportClicks,
        imageDownloadClicks,
      },
      dataManagement: {
        jsonImports,
        jsonExports,
        calendarResets,
      },
      pageViews: {
        homepage: pageViewMap['homepage_view'] || 0,
        createPage: pageViewMap['create_page_view'] || 0,
        notFound: pageViewMap['not_found_page_view'] || 0,
      },
      eventBreakdown,
    })
  } catch (error) {
    console.error('Failed to fetch high-level stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch high-level stats' },
      { status: 500 }
    )
  }
}
