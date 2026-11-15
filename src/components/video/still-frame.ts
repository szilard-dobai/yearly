import type { VideoKind } from '@/lib/video'
import {
  END_CARD_LENGTH,
  monthTimeline,
  STATS_DURATION,
  yearFillTimeline,
} from './timeline'

export function stillFrame(kind: VideoKind, dayCount: number): number {
  if (kind === 'stats') return STATS_DURATION - END_CARD_LENGTH - 10
  if (kind === 'month') return monthTimeline(dayCount).endCard - 10
  return yearFillTimeline(dayCount).fillEnd + 30
}
