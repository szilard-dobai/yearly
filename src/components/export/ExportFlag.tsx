import type { FlagDisplayMode } from '@/lib/contexts/SettingsContext'
import { getFlagEmoji } from '@/lib/countries'
import * as FlagIcons from 'country-flag-icons/react/3x2'

interface ExportFlagProps {
  code: string
  size: number
  mode: FlagDisplayMode
}

export function ExportFlag({ code, size, mode }: ExportFlagProps) {
  if (mode === 'icon') {
    const width = size * 0.92
    const height = (width * 2) / 3
    const Icon = FlagIcons[code.toUpperCase() as keyof typeof FlagIcons]
    if (Icon) {
      return (
        <Icon
          className="block shrink-0"
          style={{
            width,
            height,
            borderRadius: size * 0.06,
            boxShadow: `0 0 0 ${Math.max(1, size * 0.02)}px rgba(127, 127, 127, 0.3)`,
          }}
        />
      )
    }
    return (
      <span
        className="flex shrink-0 items-center justify-center bg-linear-to-br from-blue-400 to-blue-600 font-semibold text-white"
        style={{
          width,
          height,
          borderRadius: size * 0.06,
          fontSize: height * 0.42,
        }}
      >
        {code.toUpperCase()}
      </span>
    )
  }

  return (
    <span
      className="inline-block shrink-0"
      style={{ fontSize: size, lineHeight: 1 }}
    >
      {getFlagEmoji(code)}
    </span>
  )
}

interface ExportDayFlagsProps {
  codes: string[]
  size: number
  mode: FlagDisplayMode
}

export function ExportDayFlags({ codes, size, mode }: ExportDayFlagsProps) {
  if (codes.length !== 2) {
    return <ExportFlag code={codes[0]} size={size} mode={mode} />
  }

  return (
    <span
      className="relative block"
      style={{ width: size * 1.1, height: size * 0.9 }}
    >
      {[
        { code: codes[0], clipPath: 'polygon(0 0, 100% 0, 0 100%)' },
        { code: codes[1], clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' },
      ].map(({ code, clipPath }) => (
        <span
          key={clipPath}
          className="absolute inset-0 flex items-center justify-center overflow-hidden"
          style={{ clipPath }}
        >
          <ExportFlag code={code} size={size} mode={mode} />
        </span>
      ))}
    </span>
  )
}
