import {
  ExportRankRow,
  ExportStatTile,
  getCountryName,
} from '@/components/export/ExportBlocks'
import ExportFrame from '@/components/export/ExportFrame'
import { Flag } from '@/components/Emoji'
import {
  fitRankNameSize,
  fitStatValueSize,
  getMapExportLayout,
  type ExportFormat,
} from '@/lib/export-canvas'
import type { MapImage } from '@/lib/world-map-image'
import {
  continentsOf,
  SHADE_STEPS,
  shareOfWorld,
  type CountryDays,
  type MapColours,
  type MapMode,
} from '@/lib/world-map'

interface MapExportLayoutProps {
  map: MapImage
  countries: CountryDays[]
  title: string
  mode: MapMode
  format: ExportFormat
  colours: MapColours
}

export default function MapExportLayout({
  map,
  countries,
  title,
  mode,
  format,
  colours,
}: MapExportLayoutProps) {
  const layout = getMapExportLayout(
    format,
    countries.length,
    map.width / map.height,
    mode === 'shade'
  )
  const continents = continentsOf(countries).size
  const tiles = [
    { label: 'Countries', value: { value: String(countries.length) } },
    {
      label: 'Of the world',
      value: { value: `${shareOfWorld(countries.length)}%` },
    },
    { label: 'Continents', value: { value: String(continents), unit: 'of 7' } },
  ]
  const valueSize = fitStatValueSize(
    tiles.map(({ value }) => ({ value, width: layout.tileContentWidth })),
    layout.tileValueSize
  )
  const nameSize = fitRankNameSize(
    countries.map(({ code }) => getCountryName(code)),
    layout.rank,
    layout.rowWidth
  )

  return (
    <ExportFrame format={format} title={title}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={map.src}
        alt=""
        data-export-map
        width={layout.rowWidth}
        height={layout.mapHeight}
        style={{
          display: 'block',
          width: layout.rowWidth,
          height: layout.mapHeight,
        }}
      />

      {mode === 'shade' && (
        <div
          className="flex items-center justify-center text-gray-500 dark:text-gray-400"
          style={{
            height: layout.legendHeight,
            fontSize: layout.legendSize,
            gap: layout.legendSize * 1.2,
          }}
        >
          {SHADE_STEPS.map((step, i) => (
            <span
              key={step.label}
              className="flex items-center"
              style={{ gap: layout.legendSize * 0.4 }}
            >
              <span
                className="rounded-md"
                style={{
                  width: layout.legendSize,
                  height: layout.legendSize,
                  backgroundColor: colours.shade[i],
                }}
              />
              {step.label}
            </span>
          ))}
        </div>
      )}

      <div
        className="flex flex-col justify-center overflow-hidden"
        style={{ marginBlock: layout.sectionGap, height: layout.listHeight }}
      >
        {layout.asRows ? (
          <div className="flex flex-col" style={{ gap: layout.rowGap }}>
            {countries.map((country, index) => (
              <ExportRankRow
                key={country.code}
                rank={index + 1}
                code={country.code}
                days={country.days}
                sizes={layout.rank}
                nameSize={nameSize}
              />
            ))}
          </div>
        ) : (
          <div
            className="flex flex-wrap content-center justify-center"
            style={{
              columnGap: layout.flagGrid.columnGap,
              rowGap: layout.flagGrid.rowGap,
            }}
          >
            {countries.map((country) => (
              <div
                key={country.code}
                className="flex flex-col items-center"
                style={{
                  width: layout.flagGrid.cellWidth,
                  gap: layout.flagGrid.nameGap,
                }}
              >
                <Flag
                  code={country.code}
                  size={layout.flagGrid.flagSize}
                  resolution="large"
                />
                {layout.flagGrid.named && (
                  <span
                    className="w-full truncate text-center text-gray-600 dark:text-gray-300"
                    style={{
                      fontSize: layout.flagGrid.nameSize,
                      lineHeight: 1.25,
                    }}
                  >
                    {getCountryName(country.code)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3" style={{ gap: layout.tileGap }}>
        {tiles.map((tile) => (
          <ExportStatTile
            key={tile.label}
            label={tile.label}
            value={tile.value}
            labelSize={layout.tileLabelSize}
            valueSize={valueSize}
            height={layout.tileHeight}
            padding={layout.tilePadding}
          />
        ))}
      </div>
    </ExportFrame>
  )
}
