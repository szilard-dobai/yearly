import type { VideoDay } from '@/lib/video'

export const FILL_START = 72
export const FRAMES_PER_DAY = 4
export const END_CARD_LENGTH = 64

export function fillLength(dayCount: number, min: number, max: number) {
  return Math.min(max, Math.max(min, dayCount * FRAMES_PER_DAY))
}

export function revealFrames(
  days: VideoDay[],
  start: number,
  length: number
): (VideoDay & { frame: number })[] {
  return days.map((day, i) => ({
    ...day,
    frame: start + Math.round((i * length) / days.length),
  }))
}
