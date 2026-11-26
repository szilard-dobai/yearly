import {
  EMOJI_FILES,
  EMOJI_IMAGE_ROOT,
  FLAG_ASPECT_RATIO,
  FLAG_FILES,
  FLAG_IMAGE_SIZES,
  FLAT_FLAG_FILES,
} from './emoji-images'

export type EmojiName = keyof typeof EMOJI_FILES
export type EmojiResolution = keyof typeof FLAG_IMAGE_SIZES

export const FLAG_WIDTH_EM = 0.88
export const FLAG_HEIGHT_EM = FLAG_WIDTH_EM / FLAG_ASPECT_RATIO

export const MEDAL_EMOJI = [
  'firstPlaceMedal',
  'secondPlaceMedal',
  'thirdPlaceMedal',
] as const satisfies readonly EmojiName[]

export function hasFlagImage(code: string): boolean {
  return Object.hasOwn(FLAG_FILES, code.toUpperCase())
}

export function getFlagImageSrc(
  code: string,
  resolution: EmojiResolution = 'small'
): string | null {
  const key = code.toUpperCase()
  if (!Object.hasOwn(FLAG_FILES, key)) return null
  return `${EMOJI_IMAGE_ROOT}/flags/${resolution}/${FLAG_FILES[key]}.webp`
}

export function getFlatFlagImageSrc(code: string): string | null {
  const key = code.toUpperCase()
  if (!Object.hasOwn(FLAT_FLAG_FILES, key)) return null
  return `${EMOJI_IMAGE_ROOT}/flags/flat/${FLAT_FLAG_FILES[key]}.webp`
}

export function getEmojiImageSrc(
  name: EmojiName,
  resolution: EmojiResolution = 'small'
): string {
  return `${EMOJI_IMAGE_ROOT}/${resolution}/${EMOJI_FILES[name]}.webp`
}
