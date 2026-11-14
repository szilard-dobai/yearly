// @vitest-environment node
import { existsSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  getEmojiImageSrc,
  getFlagImageSrc,
  hasFlagImage,
  type EmojiName,
  type EmojiResolution,
} from './emoji'
import { EMOJI_FILES, FLAG_FILES } from './emoji-images'

const RESOLUTIONS: EmojiResolution[] = ['small', 'large']

describe('emoji images', () => {
  it('has both sizes of every flag and emoji in public/', () => {
    const sources = RESOLUTIONS.flatMap((resolution) => [
      ...Object.keys(FLAG_FILES).map((code) =>
        getFlagImageSrc(code, resolution)
      ),
      ...(Object.keys(EMOJI_FILES) as EmojiName[]).map((name) =>
        getEmojiImageSrc(name, resolution)
      ),
    ])
    const missing = sources.filter(
      (src) => !src || !existsSync(path.join(process.cwd(), 'public', src))
    )

    expect(missing).toEqual([])
  })

  it('finds flags by country code in either case', () => {
    expect(getFlagImageSrc('fr', 'large')).toBe(
      `/emoji/flags/large/${FLAG_FILES.FR}.webp`
    )
    expect(hasFlagImage('gb')).toBe(true)
  })

  it('has no image for codes outside the manifest', () => {
    expect(getFlagImageSrc('ZZ')).toBeNull()
    expect(hasFlagImage('toString')).toBe(false)
  })
})
