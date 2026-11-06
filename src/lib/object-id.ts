import { ObjectId } from 'mongodb'

const OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i

export function parseObjectId(value: string) {
  return OBJECT_ID_PATTERN.test(value) ? new ObjectId(value) : null
}
