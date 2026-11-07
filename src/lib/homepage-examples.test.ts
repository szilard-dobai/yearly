import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { HOMEPAGE_EXAMPLES } from './homepage-examples'

function readJpegSize(file: string) {
  const data = readFileSync(file)
  let offset = 2
  while (offset < data.length) {
    const marker = data[offset + 1]
    const length = data.readUInt16BE(offset + 2)
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker)
    ) {
      return {
        height: data.readUInt16BE(offset + 5),
        width: data.readUInt16BE(offset + 7),
      }
    }
    offset += 2 + length
  }
  throw new Error(`No JPEG frame header in ${file}`)
}

const variants = HOMEPAGE_EXAMPLES.flatMap((example) => [
  { theme: 'light', ...example.light },
  { theme: 'dark', ...example.dark },
])

describe('HOMEPAGE_EXAMPLES', () => {
  it.each(HOMEPAGE_EXAMPLES)(
    '$caption has separate light and dark images',
    ({ light, dark }) => {
      expect(dark.src).not.toBe(light.src)
      expect(dark.src).toBe(light.src.replace(/\.jpg$/, '-dark.jpg'))
    }
  )

  it.each(variants)(
    '$src exists with the declared size',
    ({ src, width, height }) => {
      const file = path.join(process.cwd(), 'public', src)

      expect(readJpegSize(file)).toEqual({ width, height })
    }
  )
})
