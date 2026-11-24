import { VIDEO_THEMES, type VideoKind, type VideoTheme } from '@/lib/video'

export const VIDEO_PACKS = {
  year: ['year', 'stats'],
  month: ['month'],
} as const satisfies Record<string, readonly VideoKind[]>

export type VideoPack = keyof typeof VIDEO_PACKS

export type VideoJob = { kind: VideoKind; theme: VideoTheme }

export type RenderedVideo = VideoJob & {
  pathname: string
  bytes: number
  posterPathname?: string
}

export function isVideoPack(value: unknown): value is VideoPack {
  return typeof value === 'string' && Object.hasOwn(VIDEO_PACKS, value)
}

export function videosInPack(pack: VideoPack): VideoJob[] {
  return VIDEO_PACKS[pack].flatMap((kind) =>
    VIDEO_THEMES.map((theme) => ({ kind, theme }))
  )
}

export function renderPathname(
  environment: string,
  renderId: string,
  { kind, theme }: VideoJob,
  extension: 'mp4' | 'jpg' = 'mp4'
): string {
  return `${environment}/renders/${renderId}/${kind}-${theme}.${extension}`
}
