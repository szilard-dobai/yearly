import { type Db, MongoClient } from 'mongodb'

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
