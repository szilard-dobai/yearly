import type { TrackingEventType } from '@/lib/tracking/types'

export const PAGE_VIEW_EVENTS = [
  'homepage_view',
  'create_page_view',
  'not_found_page_view',
] as const satisfies readonly TrackingEventType[]

export const SURVEY_EVENTS = [
  'acquisition_survey_shown',
  'acquisition_survey_answered',
  'acquisition_survey_dismissed',
] as const satisfies readonly TrackingEventType[]

export type SourceCount = { label: string; devices: number }

export type SurveyNote = { text: string; timestamp: string; country?: string }

export type TrafficSourceStats = {
  trackedDevices: number
  attributedDevices: number
  referrers: SourceCount[]
  inAppBrowsers: SourceCount[]
  utm: {
    source: SourceCount[]
    medium: SourceCount[]
    campaign: SourceCount[]
  }
  survey: {
    shown: number
    answered: number
    dismissed: number
    answers: SourceCount[]
    notes: SurveyNote[]
  }
}

type DeviceTotal = { devices: number }[]

export type TrafficSourceFacets = {
  trackedDevices: DeviceTotal
  attributedDevices: DeviceTotal
  referrers: SourceCount[]
  inAppBrowsers: SourceCount[]
  utmSource: SourceCount[]
  utmMedium: SourceCount[]
  utmCampaign: SourceCount[]
  surveyFunnel: { type: string; devices: number }[]
  surveyAnswers: SourceCount[]
  surveyNotes: { text: string; timestamp: Date | string; country?: string }[]
}

function counts(rows: SourceCount[] | undefined): SourceCount[] {
  return (rows ?? []).filter(
    (row) => typeof row.label === 'string' && row.label !== ''
  )
}

export function buildTrafficSourceStats(
  facets: Partial<TrafficSourceFacets> = {}
): TrafficSourceStats {
  const funnel = new Map(
    (facets.surveyFunnel ?? []).map((row) => [row.type, row.devices])
  )
  return {
    trackedDevices: facets.trackedDevices?.[0]?.devices ?? 0,
    attributedDevices: facets.attributedDevices?.[0]?.devices ?? 0,
    referrers: counts(facets.referrers),
    inAppBrowsers: counts(facets.inAppBrowsers),
    utm: {
      source: counts(facets.utmSource),
      medium: counts(facets.utmMedium),
      campaign: counts(facets.utmCampaign),
    },
    survey: {
      shown: funnel.get('acquisition_survey_shown') ?? 0,
      answered: funnel.get('acquisition_survey_answered') ?? 0,
      dismissed: funnel.get('acquisition_survey_dismissed') ?? 0,
      answers: counts(facets.surveyAnswers),
      notes: (facets.surveyNotes ?? []).map((note) => ({
        text: note.text,
        timestamp: new Date(note.timestamp).toISOString(),
        ...(note.country && { country: note.country }),
      })),
    },
  }
}

export function buildDateRangeParams(range?: { from?: Date; to?: Date }) {
  const params = new URLSearchParams()
  if (!range?.from) return params
  const start = new Date(range.from)
  start.setHours(0, 0, 0, 0)
  const end = new Date(range.to ?? range.from)
  end.setHours(0, 0, 0, 0)
  end.setDate(end.getDate() + 1)
  params.set('from', start.toISOString())
  params.set('to', end.toISOString())
  return params
}
