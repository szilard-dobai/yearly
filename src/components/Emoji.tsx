import {
  FLAG_HEIGHT_EM,
  FLAG_WIDTH_EM,
  getEmojiImageSrc,
  getFlagImageSrc,
  type EmojiName,
  type EmojiResolution,
} from '@/lib/emoji'
import { EMOJI_IMAGE_SIZE, FLAG_IMAGE_SIZES } from '@/lib/emoji-images'
import type { CSSProperties, ElementType } from 'react'

interface ImageOptions {
  size?: number
  title?: string
  resolution?: EmojiResolution
  lazy?: boolean
  className?: string
  style?: CSSProperties
  as?: ElementType
}

const SPLIT_CLIP_PATHS = [
  'polygon(0 0, 100% 0, 0 100%)',
  'polygon(100% 0, 100% 100%, 0 100%)',
]

function box(widthEm: number, heightEm: number, size?: number) {
  return size === undefined
    ? { width: `${widthEm}em`, height: `${heightEm}em` }
    : { width: size * widthEm, height: size * heightEm }
}

function EmojiImage({
  src,
  alt,
  intrinsic,
  widthEm,
  heightEm,
  size,
  title,
  lazy,
  className,
  style,
  as: Img = 'img',
}: Omit<ImageOptions, 'resolution'> & {
  src: string
  alt: string
  intrinsic: { width: number; height: number }
  widthEm: number
  heightEm: number
}) {
  const dimensions = box(widthEm, heightEm, size)
  return (
    <Img
      src={src}
      alt={alt}
      title={title}
      width={
        size === undefined
          ? intrinsic.width
          : Math.round(dimensions.width as number)
      }
      height={
        size === undefined
          ? intrinsic.height
          : Math.round(dimensions.height as number)
      }
      decoding="async"
      loading={lazy ? 'lazy' : undefined}
      draggable={false}
      className={className}
      style={{
        display: 'inline-block',
        flexShrink: 0,
        maxWidth: 'none',
        userSelect: 'none',
        ...dimensions,
        ...style,
      }}
    />
  )
}

function FlagFallback({
  code,
  alt,
  size,
  title,
  className,
  style,
}: Pick<ImageOptions, 'size' | 'title' | 'className' | 'style'> & {
  code: string
  alt: string
}) {
  return (
    <span
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      title={title}
      className={className}
      style={{
        display: 'inline-flex',
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '0.08em',
        background: 'rgba(127, 127, 127, 0.18)',
        color: 'rgba(127, 127, 127, 0.9)',
        fontSize: size,
        lineHeight: 1,
        ...box(FLAG_WIDTH_EM, FLAG_HEIGHT_EM),
        ...style,
      }}
    >
      <span style={{ fontSize: '0.3em', fontWeight: 600 }}>
        {code.toUpperCase()}
      </span>
    </span>
  )
}

interface FlagProps extends ImageOptions {
  code: string
  alt?: string
}

export function Flag({
  code,
  alt = '',
  resolution = 'small',
  ...options
}: FlagProps) {
  const src = getFlagImageSrc(code, resolution)
  if (!src) {
    return (
      <FlagFallback
        code={code}
        alt={alt}
        size={options.size}
        title={options.title}
        className={options.className}
        style={options.style}
      />
    )
  }
  return (
    <EmojiImage
      src={src}
      alt={alt}
      intrinsic={FLAG_IMAGE_SIZES[resolution]}
      widthEm={FLAG_WIDTH_EM}
      heightEm={FLAG_HEIGHT_EM}
      {...options}
    />
  )
}

interface DayFlagsProps extends ImageOptions {
  codes: string[]
}

export function DayFlags({
  codes,
  size,
  className,
  style,
  ...options
}: DayFlagsProps) {
  if (codes.length < 2) {
    return (
      <Flag
        code={codes[0]}
        size={size}
        className={className}
        style={style}
        {...options}
      />
    )
  }

  return (
    <span
      className={className}
      style={{
        position: 'relative',
        display: 'inline-block',
        flexShrink: 0,
        fontSize: size,
        ...box(FLAG_WIDTH_EM, FLAG_HEIGHT_EM),
        ...style,
      }}
    >
      {codes.slice(0, 2).map((code, index) => (
        <Flag
          key={code}
          code={code}
          {...options}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            clipPath: SPLIT_CLIP_PATHS[index],
          }}
        />
      ))}
    </span>
  )
}

interface EmojiProps extends ImageOptions {
  name: EmojiName
  alt?: string
}

export function Emoji({
  name,
  alt = '',
  resolution = 'small',
  style,
  ...options
}: EmojiProps) {
  const pixels = EMOJI_IMAGE_SIZE[resolution]
  return (
    <EmojiImage
      src={getEmojiImageSrc(name, resolution)}
      alt={alt}
      intrinsic={{ width: pixels, height: pixels }}
      widthEm={1}
      heightEm={1}
      style={{ verticalAlign: '-0.15em', ...style }}
      {...options}
    />
  )
}
