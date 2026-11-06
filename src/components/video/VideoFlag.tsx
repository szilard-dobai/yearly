import type { FlagDisplayMode } from '@/lib/contexts/SettingsContext'
import { getFlagEmoji } from '@/lib/countries'
import * as FlagIcons from 'country-flag-icons/react/3x2'
import { EMOJI_FONT } from './tokens'

export function VideoFlag({
  code,
  size,
  mode,
}: {
  code: string
  size: number
  mode: FlagDisplayMode
}) {
  if (mode === 'icon') {
    const width = size * 0.92
    const height = (width * 2) / 3
    const Icon = FlagIcons[code.toUpperCase() as keyof typeof FlagIcons]
    if (Icon) {
      return (
        <Icon
          style={{
            width,
            height,
            display: 'block',
            borderRadius: size * 0.06,
            boxShadow: `0 0 0 ${Math.max(1, size * 0.02)}px rgba(127,127,127,0.3)`,
          }}
        />
      )
    }
    return (
      <div
        style={{
          width,
          height,
          borderRadius: size * 0.06,
          background: 'linear-gradient(135deg, #60a5fa, #2563eb)',
          color: '#ffffff',
          fontSize: height * 0.42,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {code.toUpperCase()}
      </div>
    )
  }

  return (
    <span
      style={{
        fontFamily: EMOJI_FONT,
        fontSize: size,
        lineHeight: 1,
        display: 'inline-block',
      }}
    >
      {getFlagEmoji(code)}
    </span>
  )
}

export function DayFlags({
  codes,
  size,
  mode,
}: {
  codes: string[]
  size: number
  mode: FlagDisplayMode
}) {
  if (codes.length !== 2) {
    return <VideoFlag code={codes[0]} size={size} mode={mode} />
  }

  const half = (clipPath: string, code: string) => (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        clipPath,
      }}
    >
      <VideoFlag code={code} size={size} mode={mode} />
    </div>
  )

  return (
    <div
      style={{ position: 'relative', width: size * 1.25, height: size * 0.95 }}
    >
      {half('polygon(0 0, 100% 0, 0 100%)', codes[0])}
      {half('polygon(100% 0, 100% 100%, 0 100%)', codes[1])}
    </div>
  )
}
