import { type Collection, type Db, MongoClient, type ObjectId } from 'mongodb'
import type { FeedbackContext, FeedbackSource } from './feedback/types'
import type { CalendarProvider } from './reminders/types'
import type { DeviceType } from './tracking/types'
import type { WaitlistContext, WaitlistFeature } from './waitlist/types'

const options = {
  appName: 'devrel.vercel.integration',
  maxIdleTimeMS: 5000,
}

let dbPromise: Promise<Db> | null = null

declare global {
  var _mongoDbPromise: Promise<Db> | undefined
}

function getDb(): Promise<Db> {
  if (dbPromise) {
    return dbPromise
  }

  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('Please add your MONGODB_URI env variable')
  }

  const dbName = process.env.MONGODB_DB
  if (!dbName) {
    throw new Error('Please add your MONGODB_DB env variable')
  }

  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoDbPromise) {
      const client = new MongoClient(uri, options)
      global._mongoDbPromise = client.connect().then((c) => c.db(dbName))
    }
    dbPromise = global._mongoDbPromise
  } else {
    const client = new MongoClient(uri, options)
    dbPromise = client.connect().then((c) => c.db(dbName))
  }

  return dbPromise
}

export default getDb

export async function getTrackingCollection() {
  const db = await getDb()
  return db.collection('tracking_events')
}

export interface FeedbackDocument {
  _id?: ObjectId
  deviceId: string
  rating: number | null
  message: string | null
  source: FeedbackSource
  context?: FeedbackContext
  deviceType?: DeviceType
  userAgent?: string
  country?: string
  region?: string
  createdAt: Date
  updatedAt: Date
}

let feedbackIndexesPromise: Promise<unknown> | null = null

function ensureFeedbackIndexes(collection: Collection<FeedbackDocument>) {
  if (!feedbackIndexesPromise) {
    feedbackIndexesPromise = collection
      .createIndexes([
        { key: { createdAt: -1 } },
        { key: { rating: 1, createdAt: -1 } },
        { key: { deviceId: 1, createdAt: -1 } },
      ])
      .catch((error) => {
        console.error('Failed to create feedback indexes:', error)
        feedbackIndexesPromise = null
      })
  }
}

export async function getFeedbackCollection() {
  const db = await getDb()
  const collection = db.collection<FeedbackDocument>('feedback')
  ensureFeedbackIndexes(collection)
  return collection
}

export interface WaitlistDocument {
  _id?: ObjectId
  feature: WaitlistFeature
  email: string
  deviceId: string
  context?: WaitlistContext
  deviceType?: DeviceType
  country?: string
  region?: string
  createdAt: Date
  updatedAt: Date
}

let waitlistIndexesPromise: Promise<unknown> | null = null

function ensureWaitlistIndexes(collection: Collection<WaitlistDocument>) {
  if (!waitlistIndexesPromise) {
    waitlistIndexesPromise = collection
      .createIndexes([
        { key: { feature: 1, email: 1 }, unique: true },
        { key: { deviceId: 1, createdAt: -1 } },
      ])
      .catch((error) => {
        console.error('Failed to create waitlist indexes:', error)
        waitlistIndexesPromise = null
      })
  }
}

export async function getWaitlistCollection() {
  const db = await getDb()
  const collection = db.collection<WaitlistDocument>('waitlist')
  ensureWaitlistIndexes(collection)
  return collection
}

export interface ReminderDocument {
  _id?: ObjectId
  email: string
  year: number
  deviceId: string
  deviceType?: DeviceType
  country?: string
  region?: string
  createdAt: Date
  updatedAt: Date
}

let reminderIndexesPromise: Promise<unknown> | null = null

function ensureReminderIndexes(collection: Collection<ReminderDocument>) {
  if (!reminderIndexesPromise) {
    reminderIndexesPromise = collection
      .createIndexes([
        { key: { year: 1, email: 1 }, unique: true },
        { key: { deviceId: 1, createdAt: -1 } },
      ])
      .catch((error) => {
        console.error('Failed to create reminder indexes:', error)
        reminderIndexesPromise = null
      })
  }
}

export async function getRemindersCollection() {
  const db = await getDb()
  const collection = db.collection<ReminderDocument>('reminders')
  ensureReminderIndexes(collection)
  return collection
}

export interface CalendarReminderDocument {
  _id?: ObjectId
  deviceId: string
  year: number
  provider: CalendarProvider
  deviceType?: DeviceType
  country?: string
  region?: string
  createdAt: Date
  updatedAt: Date
}

let calendarReminderIndexesPromise: Promise<unknown> | null = null

function ensureCalendarReminderIndexes(
  collection: Collection<CalendarReminderDocument>
) {
  if (!calendarReminderIndexesPromise) {
    calendarReminderIndexesPromise = collection
      .createIndexes([
        { key: { deviceId: 1, year: 1, provider: 1 }, unique: true },
        { key: { deviceId: 1, createdAt: -1 } },
        { key: { year: 1, provider: 1 } },
      ])
      .catch((error) => {
        console.error('Failed to create calendar reminder indexes:', error)
        calendarReminderIndexesPromise = null
      })
  }
}

export async function getCalendarRemindersCollection() {
  const db = await getDb()
  const collection = db.collection<CalendarReminderDocument>(
    'reminder_calendar_adds'
  )
  ensureCalendarReminderIndexes(collection)
  return collection
}
