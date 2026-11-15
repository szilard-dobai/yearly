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

export const STATS_DURATION = 418

export function yearFillTimeline(dayCount: number) {
  const fillEnd = FILL_START + fillLength(dayCount, 30, 180)
  const endCard = fillEnd + 84
  return { fillEnd, endCard, duration: endCard + END_CARD_LENGTH }
}

export function monthTimeline(dayCount: number) {
  const fillEnd = FILL_START + fillLength(dayCount, 30, 120)
  const settle = fillEnd + 14
  const stats = settle + 18
  const list = stats + 26
  const endCard = fillEnd + 144
  return {
    fillEnd,
    settle,
    stats,
    list,
    endCard,
    duration: endCard + END_CARD_LENGTH,
  }
}
