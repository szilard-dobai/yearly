import type { VideoTheme } from '@/lib/video'
import { Easing, interpolate, spring } from 'remotion'

export const FPS = 30
export const VIDEO_WIDTH = 1080
export const VIDEO_HEIGHT = 1920

export const EMOJI_FONT =
  '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif'
export const SANS = `var(--font-geist-sans), ui-sans-serif, system-ui, ${EMOJI_FONT}`
export const SERIF = 'var(--font-newsreader), Georgia, serif'

export type Palette = {
  name: VideoTheme
  canvas: string
  card: string
  border: string
  divider: string
  text: string
  heading: string
  secondary: string
  muted: string
  label: string
  red: string
  statBg: string
  pill: string
  pillText: string
  primaryBtn: string
  primaryBtnText: string
}

export const PALETTES: Record<VideoTheme, Palette> = {
  dark: {
    name: 'dark',
    canvas: '#000000',
    card: '#000000',
    border: 'rgba(255,255,255,0.08)',
    divider: 'rgba(255,255,255,0.10)',
    text: '#ffffff',
    heading: '#f4f4f5',
    secondary: '#a1a1aa',
    muted: '#71717a',
    label: '#99a1af',
    red: '#fb2c36',
    statBg: 'rgba(255,255,255,0.05)',
    pill: 'rgba(255,255,255,0.10)',
    pillText: '#d1d5dc',
    primaryBtn: '#f5f5f5',
    primaryBtnText: '#0a0a0a',
  },
  light: {
    name: 'light',
    canvas: '#ffffff',
    card: '#ffffff',
    border: '#e5e7eb',
    divider: '#e5e7eb',
    text: '#101828',
    heading: '#101828',
    secondary: '#4a5565',
    muted: '#6a7282',
    label: '#6a7282',
    red: '#fb2c36',
    statBg: '#f3f4f6',
    pill: '#e5e7eb',
    pillText: '#4a5565',
    primaryBtn: '#171717',
    primaryBtnText: '#fafafa',
  },
}

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1)
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1)

export const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const

export function fadeUp(
  frame: number,
  start: number,
  duration = 18,
  distance = 40
) {
  const p = interpolate(frame, [start, start + duration], [0, 1], {
    ...clamp,
    easing: easeOut,
  })
  return { opacity: p, transform: `translateY(${(1 - p) * distance}px)` }
}

export function popAt(framesSinceStart: number) {
  return spring({
    frame: framesSinceStart,
    fps: FPS,
    config: { damping: 11, stiffness: 220, mass: 0.6 },
  })
}

export function smooth(
  frame: number,
  start: number,
  durationInFrames?: number
) {
  return spring({
    frame: frame - start,
    fps: FPS,
    config: { damping: 200 },
    durationInFrames,
  })
}

export function countUp(
  frame: number,
  start: number,
  duration: number,
  to: number
) {
  return interpolate(frame, [start, start + duration], [0, to], {
    ...clamp,
    easing: easeOut,
  })
}

export function plural(count: number, one: string, many: string) {
  return count === 1 ? one : many
}
