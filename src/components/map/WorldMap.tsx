'use client'

import { getFlatFlagImageSrc } from '@/lib/emoji'
import { countryName, pluralDays } from '@/lib/trips'
import { cn } from '@/lib/utils'
import {
  FADED_OPACITY,
  getMapScene,
  shadeIndex,
  SOLID_FLAG_FILLS,
  STRIPED_FLAGS,
  viewBox,
  type CountryDays,
  type MapColours,
  type MapMode,
  type MapShape,
  type World,
} from '@/lib/world-map'
import {
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'

const TOOLTIP_MARGIN = 72

interface WorldMapProps {
  world: World
  countries: CountryDays[]
  mode: MapMode
  focusCodes: string[] | null
  colours: MapColours
  className?: string
}

export default function WorldMap({
  world,
  countries,
  mode,
  focusCodes,
  colours,
  className,
}: WorldMapProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const containerRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<{
    shape: MapShape
    x: number
    y: number
  } | null>(null)
  const scene = useMemo(
    () => getMapScene(world, countries, focusCodes),
    [world, countries, focusCodes]
  )
  const flags = useMemo(
    () =>
      mode === 'flags'
        ? new Map(
            [...scene.tileByCode.keys()].map((code) => [
              code,
              getFlatFlagImageSrc(code),
            ])
          )
        : new Map<string, string | null>(),
    [mode, scene]
  )
  const dotCodes = new Set(scene.dots.map((dot) => dot.code))

  const fill = (code: string, kind: 'area' | 'dot') => {
    const solid = mode === 'flags' ? SOLID_FLAG_FILLS.get(code) : undefined
    if (solid) return solid
    if (flags.get(code)) return `url(#${uid}-${kind}-${code})`
    return colours.shade[shadeIndex(scene.daysByCode.get(code) ?? 0)]
  }

  const point = (shape: MapShape) => (event: ReactPointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const margin = Math.min(TOOLTIP_MARGIN, rect.width / 2)
    setHover({
      shape,
      x: Math.min(
        Math.max(event.clientX - rect.left, margin),
        rect.width - margin
      ),
      y: event.clientY - rect.top,
    })
  }

  const hoverDays = hover?.shape.code
    ? scene.daysByCode.get(hover.shape.code)
    : undefined

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full', className)}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') setHover(null)
      }}
    >
      <svg
        viewBox={viewBox(scene.view)}
        className="block h-auto w-full touch-manipulation"
        role="img"
        aria-label={`World map with ${scene.daysByCode.size} ${scene.daysByCode.size === 1 ? 'country' : 'countries'} filled in`}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) setHover(null)
        }}
      >
        <defs>
          {[...flags].map(([code, src]) => {
            const tile = scene.tileByCode.get(code)
            if (!src || !tile) return null
            const [[x0, y0], [x1, y1]] = tile
            const width = Math.max(x1 - x0, 0.01)
            const height = Math.max(y1 - y0, 0.01)
            return (
              <g key={code}>
                <pattern
                  id={`${uid}-area-${code}`}
                  patternUnits="userSpaceOnUse"
                  x={x0}
                  y={y0}
                  width={width}
                  height={height}
                >
                  <image
                    href={src}
                    width={width}
                    height={height}
                    preserveAspectRatio={
                      STRIPED_FLAGS.has(code) ? 'none' : 'xMidYMid slice'
                    }
                  />
                </pattern>
                {dotCodes.has(code) && (
                  <pattern
                    id={`${uid}-dot-${code}`}
                    patternContentUnits="objectBoundingBox"
                    width="1"
                    height="1"
                  >
                    <image
                      href={src}
                      width="1"
                      height="1"
                      preserveAspectRatio="xMidYMid slice"
                    />
                  </pattern>
                )}
              </g>
            )
          })}
        </defs>
        {scene.shapes.map((shape, i) => {
          if (!shape.d) return null
          const visited =
            shape.code !== null && scene.daysByCode.has(shape.code)
          return (
            <path
              key={`${shape.code ?? shape.name}-${i}`}
              d={shape.d}
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
              className={cn(
                'stroke-white dark:stroke-[#141414]',
                visited && 'transition-opacity hover:opacity-80'
              )}
              fillOpacity={
                visited && scene.faded.has(shape.code!)
                  ? FADED_OPACITY
                  : undefined
              }
              style={{
                fill: visited ? fill(shape.code!, 'area') : colours.empty,
              }}
              onPointerMove={point(shape)}
              onPointerDown={point(shape)}
            />
          )
        })}
        {mode === 'flags' &&
          scene.shapes.map((shape, i) =>
            shape.d && shape.code && scene.daysByCode.has(shape.code) ? (
              <path
                key={`outline-${shape.code}-${i}`}
                d={shape.d}
                fill="none"
                stroke={colours.outline}
                strokeOpacity={
                  scene.faded.has(shape.code) ? FADED_OPACITY : undefined
                }
                strokeWidth={0.75}
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            ) : null
          )}
        {scene.dots.map((shape) => (
          <circle
            key={`dot-${shape.code}`}
            cx={shape.centroid[0]}
            cy={shape.centroid[1]}
            r={scene.dotRadius}
            opacity={scene.faded.has(shape.code!) ? FADED_OPACITY : undefined}
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            className={cn(
              mode === 'shade' && 'stroke-white dark:stroke-[#141414]'
            )}
            style={{
              fill: fill(shape.code!, 'dot'),
              stroke: mode === 'flags' ? colours.outline : undefined,
            }}
            onPointerMove={point(shape)}
            onPointerDown={point(shape)}
          />
        ))}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs whitespace-nowrap shadow-md dark:border-white/8 dark:bg-[#1a1a1a]"
          style={{ left: hover.x, top: hover.y - 10 }}
        >
          <div className="font-medium text-gray-900 dark:text-zinc-100">
            {hover.shape.code
              ? countryName(hover.shape.code)
              : hover.shape.name}
          </div>
          <div className="text-gray-500 dark:text-zinc-400">
            {hoverDays ? pluralDays(hoverDays) : 'Not visited yet'}
          </div>
        </div>
      )}
    </div>
  )
}
