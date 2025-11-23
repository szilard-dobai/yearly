import { describe, it, expect } from 'vitest'
import { generateId } from './utils'

describe('utils', () => {
  describe('generateId', () => {
    it('should generate a string', () => {
      const id = generateId()
      expect(typeof id).toBe('string')
    })

    it('should generate non-empty strings', () => {
      const id = generateId()
      expect(id.length).toBeGreaterThan(0)
    })

    it('should generate unique IDs', () => {
      const id1 = generateId()
      const id2 = generateId()
      expect(id1).not.toBe(id2)
    })

    it('should generate multiple unique IDs', () => {
      const ids = new Set()
      for (let i = 0; i < 100; i++) {
        ids.add(generateId())
      }
      expect(ids.size).toBe(100)
    })

    it('should include timestamp component', () => {
      const id = generateId()
      const parts = id.split('-')
      expect(parts.length).toBe(2)
      expect(Number(parts[0])).toBeGreaterThan(0)
    })

    it('should be sortable by time', async () => {
      const id1 = generateId()
      await new Promise((resolve) => setTimeout(resolve, 2))
      const id2 = generateId()
      expect(id1 < id2).toBe(true)
    })
  })
})
