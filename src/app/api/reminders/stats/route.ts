import { getRemindersCollection, getTrackingCollection } from '@/lib/mongodb'
import { getReminderSendBlock } from '@/lib/reminders/send-run'
import { createReminderSendStore } from '@/lib/reminders/send-store'
import {
  REMINDER_STATS_EVENTS,
  type ReminderEventAggregate,
  type ReminderStats,
  summarizeReminderEvents,
} from '@/lib/reminders/stats'
import { requireAdmin } from '@/lib/tracking/api'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000

export async function GET(request: Request) {
  const denied = await requireAdmin(request)
  if (denied) return denied

  const now = new Date()
  const year = now.getUTCFullYear()

  try {
    const [reminders, tracking] = await Promise.all([
      getRemindersCollection(),
      getTrackingCollection(),
    ])

    const [signups, rows, sendCounts] = await Promise.all([
      reminders
        .find(
          { year },
          {
            projection: { _id: 0, email: 1, createdAt: 1 },
            sort: { createdAt: 1 },
          }
        )
        .toArray(),
      tracking
        .aggregate<ReminderEventAggregate>([
          {
            $match: {
              type: { $in: [...REMINDER_STATS_EVENTS] },
              'metadata.year': year,
            },
          },
          {
            $group: {
              _id: { type: '$type', provider: '$metadata.provider' },
              devices: { $addToSet: '$deviceId' },
            },
          },
          {
            $project: {
              _id: 0,
              type: '$_id.type',
              provider: '$_id.provider',
              devices: { $size: '$devices' },
            },
          },
        ])
        .toArray(),
      createReminderSendStore(reminders, year).count(now),
    ])

    const weekAgo = Date.now() - SEVEN_DAYS_MS
    const stats: ReminderStats = {
      year,
      total: signups.length,
      lastSevenDays: signups.filter(
        (signup) => new Date(signup.createdAt).getTime() >= weekAgo
      ).length,
      emails: signups.map((signup) => signup.email),
      ...summarizeReminderEvents(rows),
      send: {
        sent: sendCounts.sent,
        failed: sendCounts.failed,
        left: sendCounts.total - sendCounts.sent,
        needsCheck: sendCounts.needsCheck,
        blocked: getReminderSendBlock(now),
      },
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Failed to fetch reminder stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reminder stats' },
      { status: 500 }
    )
  }
}
