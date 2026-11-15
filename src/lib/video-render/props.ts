import {
  EXAMPLE_MONTH,
  EXAMPLE_YEAR,
  getExampleVisits,
} from '@/lib/homepage-examples'
import { fromCalendarDays } from '@/lib/calendar-sync/days'
import { db } from '@/lib/db'
import { buildMonthVideoData, buildYearVideoData } from '@/lib/video'
import { getRenderJob } from '@/lib/videos/orders'
import type { VideoJob } from './packs'

export const EXAMPLE_RENDER_PREFIX = 'example-'

export function exampleRenderId(now = Date.now()): string {
  return `${EXAMPLE_RENDER_PREFIX}${now.toString(36)}`
}

export function isExampleRender(renderId: string): boolean {
  return renderId.startsWith(EXAMPLE_RENDER_PREFIX)
}

function exampleProps({ kind, theme }: VideoJob) {
  const visits = getExampleVisits()
  const data =
    kind === 'month'
      ? buildMonthVideoData(visits, EXAMPLE_YEAR, EXAMPLE_MONTH)
      : buildYearVideoData(visits, EXAMPLE_YEAR)
  return { data, theme, weekStartsOn: 1 }
}

export async function loadVideoProps(
  renderId: string,
  job: VideoJob
): Promise<Record<string, unknown> | null> {
  if (isExampleRender(renderId)) return exampleProps(job)

  const found = await getRenderJob(db, renderId)
  if (!found) return null
  const { render, order } = found
  const visits = fromCalendarDays(render.data.days, [])
  const data =
    job.kind === 'month'
      ? buildMonthVideoData(visits, order.year, order.month ?? 0)
      : buildYearVideoData(visits, order.year)
  return { data, theme: job.theme, weekStartsOn: render.data.weekStartsOn }
}
