// @vitest-environment node
import { type Db, MongoClient } from 'mongodb'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { applyMongoRetention } from './retention'

const MONGO_TEST_URL = process.env.MONGO_TEST_URL
const NOW = new Date('2026-11-14T03:00:00Z')

function monthsAgo(months: number, hour = 15) {
  const date = new Date(NOW)
  date.setUTCMonth(date.getUTCMonth() - months)
  date.setUTCHours(hour, 42, 7, 0)
  return date
}

const identifiedMetadata = {
  countries: [{ countryCode: 'JP', days: 4 }],
  referrer: 'https://www.instagram.com/',
  utm: { utm_source: 'instagram' },
  inAppBrowser: 'Instagram',
  userAgent: 'Mozilla/5.0 Instagram 312.0',
  otherText: 'my friend Ana',
}

describe.skipIf(!MONGO_TEST_URL)(
  'applyMongoRetention against a real MongoDB',
  () => {
    let client: MongoClient
    let db: Db

    beforeAll(async () => {
      client = new MongoClient(MONGO_TEST_URL!)
      await client.connect()
      db = client.db(`yearly_retention_test_${Date.now()}`)
    })

    afterAll(async () => {
      await db?.dropDatabase()
      await client?.close()
    })

    beforeEach(async () => {
      await db.dropDatabase()
      await db.collection('tracking_events').insertMany([
        {
          _id: 'recent' as never,
          type: 'image_download_click',
          timestamp: monthsAgo(1),
          deviceId: 'dev-1',
          deviceType: 'mobile',
          country: 'SG',
          region: '01',
          metadata: identifiedMetadata,
        },
        {
          _id: 'almost' as never,
          type: 'image_download_click',
          timestamp: monthsAgo(25),
          deviceId: 'dev-2',
          region: '01',
          metadata: identifiedMetadata,
        },
        {
          _id: 'old' as never,
          type: 'image_download_click',
          timestamp: monthsAgo(27),
          deviceId: 'dev-3',
          deviceType: 'desktop',
          country: 'GB',
          region: 'ENG',
          metadata: identifiedMetadata,
        },
        {
          _id: 'ancient' as never,
          type: 'homepage_view',
          timestamp: monthsAgo(61),
          deviceId: 'dev-4',
        },
        {
          _id: 'string-date' as never,
          type: 'homepage_view',
          timestamp: '2019-01-01T00:00:00.000Z',
          deviceId: 'dev-5',
        },
        { _id: 'no-date' as never, type: 'homepage_view', deviceId: 'dev-6' },
      ])
      await db.collection('feedback').insertMany([
        {
          _id: 'recent' as never,
          rating: 5,
          message: 'Love it',
          deviceId: 'dev-1',
          userAgent: 'UA',
          country: 'SG',
          region: '01',
          createdAt: monthsAgo(1),
        },
        {
          _id: 'old' as never,
          rating: 4,
          message: 'Nice',
          deviceId: 'dev-3',
          userAgent: 'UA',
          country: 'GB',
          region: 'ENG',
          createdAt: monthsAgo(27),
        },
        {
          _id: 'ancient' as never,
          rating: 3,
          message: 'Ok',
          deviceId: 'dev-4',
          createdAt: monthsAgo(61),
        },
      ])
      await db.collection('reminder_calendar_adds').insertMany([
        {
          _id: 'old' as never,
          provider: 'google',
          year: 2024,
          deviceId: 'dev-3',
          region: 'ENG',
          country: 'GB',
          createdAt: monthsAgo(27),
        },
        {
          _id: 'recent' as never,
          provider: 'apple',
          year: 2026,
          deviceId: 'dev-1',
          region: '01',
          createdAt: monthsAgo(1),
        },
      ])
      await db.collection('reminders').insertMany([
        { _id: 'last-year' as never, email: 'a@example.com', year: 2025 },
        { _id: 'this-year' as never, email: 'b@example.com', year: 2026 },
        { _id: 'next-year' as never, email: 'c@example.com', year: 2027 },
      ])
      await db
        .collection('waitlist')
        .insertOne({ email: 'w@example.com', createdAt: monthsAgo(70) })
    })

    async function ids(collection: string) {
      return (await db.collection(collection).find().toArray())
        .map((doc) => String(doc._id))
        .sort()
    }

    it('counts in a dry run exactly what the real run then changes', async () => {
      const before = await db.collection('tracking_events').find().toArray()
      const planned = await applyMongoRetention(db, NOW, { dryRun: true })

      expect(await db.collection('tracking_events').find().toArray()).toEqual(
        before
      )
      expect(await applyMongoRetention(db, NOW)).toEqual(planned)
      expect(planned).toEqual({
        eventsDeleted: 1,
        eventsAnonymized: 1,
        feedbackDeleted: 1,
        feedbackAnonymized: 1,
        calendarAddsDeleted: 0,
        calendarAddsAnonymized: 1,
        remindersDeleted: 1,
      })
    })

    it('leaves recent and malformed events alone and deletes only the 5-year-old one', async () => {
      const recentBefore = await db
        .collection('tracking_events')
        .findOne({ _id: 'recent' as never })
      await applyMongoRetention(db, NOW)

      expect(await ids('tracking_events')).toEqual([
        'almost',
        'no-date',
        'old',
        'recent',
        'string-date',
      ])
      expect(
        await db
          .collection('tracking_events')
          .findOne({ _id: 'recent' as never })
      ).toEqual(recentBefore)
      expect(
        await db
          .collection('tracking_events')
          .findOne({ _id: 'almost' as never })
      ).toMatchObject({ deviceId: 'dev-2', metadata: identifiedMetadata })
    })

    it('strips identifiers from 26-month-old events and keeps the rest', async () => {
      await applyMongoRetention(db, NOW)

      const old = await db
        .collection('tracking_events')
        .findOne({ _id: 'old' as never })
      expect(old).toEqual({
        _id: 'old',
        type: 'image_download_click',
        timestamp: new Date(
          Date.UTC(
            monthsAgo(27).getUTCFullYear(),
            monthsAgo(27).getUTCMonth(),
            monthsAgo(27).getUTCDate()
          )
        ),
        deviceType: 'desktop',
        country: 'GB',
        metadata: { countries: [{ countryCode: 'JP', days: 4 }] },
        anonymized: true,
      })
    })

    it('strips identifiers from old feedback and calendar reminders, keeping their dates', async () => {
      await applyMongoRetention(db, NOW)

      expect(await ids('feedback')).toEqual(['old', 'recent'])
      expect(
        await db.collection('feedback').findOne({ _id: 'old' as never })
      ).toEqual({
        _id: 'old',
        rating: 4,
        message: 'Nice',
        country: 'GB',
        createdAt: monthsAgo(27),
        anonymized: true,
      })
      expect(
        await db
          .collection('reminder_calendar_adds')
          .findOne({ _id: 'old' as never })
      ).toEqual({
        _id: 'old',
        provider: 'google',
        year: 2024,
        country: 'GB',
        createdAt: monthsAgo(27),
        anonymized: true,
      })
      expect(
        await db
          .collection('reminder_calendar_adds')
          .findOne({ _id: 'recent' as never })
      ).toMatchObject({ deviceId: 'dev-1', region: '01' })
    })

    it('deletes reminder emails only for past years and never touches the waitlist', async () => {
      await applyMongoRetention(db, NOW)

      expect(await ids('reminders')).toEqual(['next-year', 'this-year'])
      expect(await db.collection('waitlist').countDocuments()).toBe(1)
    })

    it('changes nothing the second time', async () => {
      await applyMongoRetention(db, NOW)
      const after = await db.collection('tracking_events').find().toArray()

      expect(await applyMongoRetention(db, NOW)).toEqual({
        eventsDeleted: 0,
        eventsAnonymized: 0,
        feedbackDeleted: 0,
        feedbackAnonymized: 0,
        calendarAddsDeleted: 0,
        calendarAddsAnonymized: 0,
        remindersDeleted: 0,
      })
      expect(await db.collection('tracking_events').find().toArray()).toEqual(
        after
      )
    })
  }
)
