import {
  EXAMPLE_MONTH,
  EXAMPLE_YEAR,
  getExampleVisits,
} from '@/lib/homepage-examples'
import { buildMonthVideoData, buildYearVideoData } from '@/lib/video'
import type { VideoJob } from './packs'

export const EXAMPLE_RENDER_PREFIX = 'example-'

export function exampleRenderId(now = Date.now()): string {
  return `${EXAMPLE_RENDER_PREFIX}${now.toString(36)}`
}

export function loadVideoProps(
  renderId: string,
  { kind, theme }: VideoJob
): Record<string, unknown> | null {
  if (!renderId.startsWith(EXAMPLE_RENDER_PREFIX)) return null
  const visits = getExampleVisits()
  const data =
    kind === 'month'
      ? buildMonthVideoData(visits, EXAMPLE_YEAR, EXAMPLE_MONTH)
      : buildYearVideoData(visits, EXAMPLE_YEAR)
  return { data, theme, weekStartsOn: 1 }
}
