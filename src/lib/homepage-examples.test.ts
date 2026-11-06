import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { HOMEPAGE_EXAMPLES } from './homepage-examples'

describe('HOMEPAGE_EXAMPLES', () => {
  it.each(HOMEPAGE_EXAMPLES)('$src exists in public/', ({ src }) => {
    expect(existsSync(path.join(process.cwd(), 'public', src))).toBe(true)
  })
})
