'use client'

import { countryName, pluralDays } from '@/lib/trips'
import { cn } from '@/lib/utils'
import {
  fitView,
  loadWorld,
  shadeClass,
  shadeIndex,
  type MapPalette,
  type CountryDays,
  type MapShape,
  type World,
} from '@/lib/world-map'
import * as FlagIcons from 'country-flag-icons/react/3x2'
import { useEffect, useId, useMemo, useRef, useState } from 'react'

export type MapMode = 'flags' | 'shade'

const TINY_AREA = 24

export function useWorld(): World | null {
  const [world, setWorld] = useState<World | null>(null)
  useEffect(() => {
    let active = true
    loadWorld().then((loaded) => active && setWorld(loaded))
    return () => {
      active = false
    }
  }, [])
  return world
}

interface WorldMapProps {
  countries: CountryDays[]
  world?: World | null
  mode?: MapMode
  focusCodes?: string[] | null
  interactive?: boolean
  className?: string
  emptyClassName?: string
  strokeClassName?: string
  palette?: MapPalette
}

export default function WorldMap({
  countries,
  world: preloaded,
  mode = 'flags',
  focusCodes = null,
  interactive = true,
  className,
  emptyClassName = 'fill-zinc-200 dark:fill-zinc-800',
  strokeClassName = 'stroke-white dark:stroke-[#141414]',
  palette,
}: WorldMapProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const loaded = useWorld()
  const world = preloaded ?? loaded
  const [hover, setHover] = useState<{
    shape: MapShape
    x: number
    y: number
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const daysByCode = useMemo(
    () => new Map(countries.map((c) => [c.code, c.days])),
    [countries]
  )

  if (!world) {
    return (
      <div
        className={cn(
          'aspect-[2.1/1] w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-900',
          className
        )}
      />
    )
  }

  const largestByCode = new Map<string, MapShape>()
  for (const shape of world.shapes) {
    if (!shape.code || !daysByCode.has(shape.code)) continue
    const current = largestByCode.get(shape.code)
    if (!current || shape.area > current.area) {
      largestByCode.set(shape.code, shape)
    }
  }
  const visited = [...largestByCode.values()]
  const view = focusCodes
    ? fitView(
        world.viewBox,
        visited.filter((s) => focusCodes.includes(s.code!))
      )
    : null
  const scale = view?.scale ?? 1
  const tiny = visited.filter((s) => s.area < TINY_AREA * scale * scale)

  const fill = (
    code: string,
    kind: 'area' | 'dot'
  ): { className?: string; style?: React.CSSProperties } => {
    const days = daysByCode.get(code) ?? 0
    if (mode === 'shade') {
      return palette
        ? { style: { fill: palette.shade[shadeIndex(days)] } }
        : { className: shadeClass(days) }
    }
    return { style: { fill: `url(#${uid}-${kind}-${code})` } }
  }
  const strokeStyle = palette ? { stroke: palette.stroke } : undefined
  const emptyStyle = palette ? { fill: palette.empty } : undefined
  const strokeClass = palette ? undefined : strokeClassName

  const pointer = (shape: MapShape) => (event: React.PointerEvent) => {
    if (!interactive) return
    const rect = containerRef.current!.getBoundingClientRect()
    setHover({
      shape,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    })
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative w-full', className)}
      onPointerLeave={() => setHover(null)}
    >
      <svg
        viewBox={view?.viewBox ?? world.viewBox}
        className="block h-auto w-full"
        role="img"
        aria-label={`World map with ${visited.length} ${visited.length === 1 ? 'country' : 'countries'} filled in`}
      >
        {mode === 'flags' && (
          <defs>
            {visited.map((shape) => {
              const Icon = FlagIcons[shape.code as keyof typeof FlagIcons]
              if (!Icon) return null
              const [[x0, y0], [x1, y1]] = shape.bounds
              const width = Math.max(1, x1 - x0)
              const height = Math.max(1, y1 - y0)
              return (
                <g key={shape.code}>
                  <pattern
                    id={`${uid}-area-${shape.code}`}
                    patternUnits="userSpaceOnUse"
                    x={x0}
                    y={y0}
                    width={width}
                    height={height}
                  >
                    <Icon
                      width={width}
                      height={height}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  </pattern>
                  <pattern
                    id={`${uid}-dot-${shape.code}`}
                    patternContentUnits="objectBoundingBox"
                    width="1"
                    height="1"
                  >
                    <Icon
                      width="1"
                      height="1"
                      preserveAspectRatio="xMidYMid slice"
                    />
                  </pattern>
                </g>
              )
            })}
          </defs>
        )}
        {world.shapes.map((shape, i) => {
          const isVisited = shape.code !== null && daysByCode.has(shape.code)
          const visitedFill = isVisited ? fill(shape.code!, 'area') : null
          return (
            <path
              key={`${shape.code ?? shape.name}-${i}`}
              d={shape.d}
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
              className={cn(
                strokeClass,
                isVisited ? visitedFill?.className : !palette && emptyClassName,
                interactive && 'transition-opacity hover:opacity-80'
              )}
              style={{
                ...strokeStyle,
                ...(isVisited ? visitedFill?.style : emptyStyle),
              }}
              onPointerMove={pointer(shape)}
              onPointerDown={pointer(shape)}
            />
          )
        })}
        {tiny.map((shape) => {
          const dot = fill(shape.code!, 'dot')
          return (
            <circle
              key={`dot-${shape.code}`}
              cx={shape.centroid[0]}
              cy={shape.centroid[1]}
              r={5 * scale}
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
              className={cn(strokeClass, dot.className)}
              style={{ ...strokeStyle, ...dot.style }}
              onPointerMove={pointer(shape)}
              onPointerDown={pointer(shape)}
            />
          )
        })}
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs shadow-md dark:border-white/8 dark:bg-[#1a1a1a]"
          style={{ left: hover.x, top: hover.y - 10 }}
        >
          <div className="font-medium text-gray-900 dark:text-zinc-100">
            {hover.shape.code
              ? countryName(hover.shape.code)
              : hover.shape.name}
          </div>
          <div className="text-gray-500 dark:text-zinc-400">
            {hover.shape.code && daysByCode.has(hover.shape.code)
              ? pluralDays(daysByCode.get(hover.shape.code)!)
              : 'Not visited yet'}
          </div>
        </div>
      )}
    </div>
  )
}
