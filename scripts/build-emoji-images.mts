import { createHash } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import sharp from 'sharp'

export const NOTO_COMMIT = '99701e07d3d1fe1bdbcdb14964547f0fd592966f'

const SOURCE = `https://raw.githubusercontent.com/googlefonts/noto-emoji/${NOTO_COMMIT}`
const ROOT = path.resolve(import.meta.dirname, '..')
const CACHE = path.join(ROOT, 'node_modules/.cache/noto-emoji', NOTO_COMMIT)
const OUTPUT = path.join(ROOT, 'public/emoji')
const MANIFEST = path.join(ROOT, 'src/lib/emoji-images.ts')

export const EMOJI = {
  airplane: '2708',
  barChart: '1f4ca',
  calendar: '1f4c5',
  cameraWithFlash: '1f4f8',
  gear: '2699',
  partyPopper: '1f389',
  raisingHands: '1f64c',
  speechBalloon: '1f4ac',
  warning: '26a0',
  firstPlaceMedal: '1f947',
  secondPlaceMedal: '1f948',
  thirdPlaceMedal: '1f949',
  sportsMedal: '1f3c5',
  compass: '1f9ed',
  raisedHand: '270b',
  directHit: '1f3af',
  globeEuropeAfrica: '1f30d',
  worldMap: '1f5fa',
  globeWithMeridians: '1f310',
  train: '1f686',
  backpack: '1f392',
  luggage: '1f9f3',
  desertIsland: '1f3dd',
  hundredPoints: '1f4af',
  automobile: '1f697',
  clinkingGlasses: '1f942',
  roundPushpin: '1f4cd',
  fallenLeaf: '1f342',
  spiralCalendar: '1f5d3',
} as const

export const FLAG_WIDTHS = { small: 64, large: 128 } as const
export const EMOJI_WIDTHS = { small: 96, large: 128 } as const

export const FILTER = { saturate: 0.82, contrast: 0.92, brightness: 1.02 }

const FLAG_VIEWBOX = 1000

type Rgb = [number, number, number]
type Box = { x: number; y: number; width: number; height: number }

const NAMED_COLOURS: Record<string, Rgb> = {
  black: [0, 0, 0],
  white: [255, 255, 255],
  red: [255, 0, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  gray: [128, 128, 128],
  grey: [128, 128, 128],
}

const COLOUR_PROPERTIES = [
  'fill',
  'stroke',
  'stop-color',
  'flood-color',
  'lighting-color',
  'color',
]

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value))
}

export function treatColour([r, g, b]: Rgb): Rgb {
  const s = FILTER.saturate
  const [R, G, B] = [r / 255, g / 255, b / 255]
  const saturated = [
    (0.213 + 0.787 * s) * R + (0.715 - 0.715 * s) * G + (0.072 - 0.072 * s) * B,
    (0.213 - 0.213 * s) * R + (0.715 + 0.285 * s) * G + (0.072 - 0.072 * s) * B,
    (0.213 - 0.213 * s) * R + (0.715 - 0.715 * s) * G + (0.072 + 0.928 * s) * B,
  ].map(clamp01)
  const contrasted = saturated.map((v) =>
    clamp01(v * FILTER.contrast + 0.5 - 0.5 * FILTER.contrast)
  )
  return contrasted.map((v) =>
    Math.round(clamp01(v * FILTER.brightness) * 255)
  ) as Rgb
}

function parseChannel(value: string) {
  const v = value.trim()
  return v.endsWith('%') ? (parseFloat(v) / 100) * 255 : parseFloat(v)
}

function parseAlpha(value: string | undefined) {
  if (value === undefined) return 1
  const v = value.trim()
  return v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v)
}

function parseColour(value: string): { rgb: Rgb; alpha: number } | null {
  const v = value.trim().toLowerCase()
  const hex = v.match(/^#([0-9a-f]{3,8})$/)
  if (hex) {
    let digits = hex[1]
    if (digits.length === 3 || digits.length === 4) {
      digits = [...digits].map((d) => d + d).join('')
    }
    if (digits.length !== 6 && digits.length !== 8) return null
    const channels = digits.match(/../g)!.map((pair) => parseInt(pair, 16))
    return {
      rgb: [channels[0], channels[1], channels[2]],
      alpha: digits.length === 8 ? channels[3] / 255 : 1,
    }
  }
  const fn = v.match(/^rgba?\(([^)]*)\)$/)
  if (fn) {
    const parts = fn[1].split(/[\s,/]+/).filter(Boolean)
    if (parts.length < 3) return null
    return {
      rgb: parts.slice(0, 3).map(parseChannel) as Rgb,
      alpha: parseAlpha(parts[3]),
    }
  }
  const named = NAMED_COLOURS[v]
  return named ? { rgb: named, alpha: 1 } : null
}

function formatColour([r, g, b]: Rgb, alpha: number) {
  if (alpha >= 1) {
    return `#${[r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')}`
  }
  return `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(4))})`
}

function treatValue(value: string, file: string): string {
  const v = value.trim()
  if (/^(none|transparent|inherit|currentcolor)$/i.test(v)) {
    if (/^currentcolor$/i.test(v)) {
      throw new Error(`${file}: currentColor is not handled`)
    }
    return v
  }
  const url = v.match(/^(url\([^)]*\))\s*(.*)$/)
  if (url) return url[2] ? `${url[1]} ${treatValue(url[2], file)}` : url[1]
  const colour = parseColour(v)
  if (!colour) throw new Error(`${file}: unknown colour "${value}"`)
  return formatColour(treatColour(colour.rgb), colour.alpha)
}

function treatDeclarations(css: string, file: string) {
  return css.replace(
    new RegExp(
      `(^|[;{\\s])(${COLOUR_PROPERTIES.join('|')})\\s*:\\s*([^;}]+)`,
      'g'
    ),
    (_, before: string, property: string, value: string) =>
      `${before}${property}:${treatValue(value, file)}`
  )
}

const TREATED_BLACK = formatColour(treatColour([0, 0, 0]), 1)

export function treatSvgColours(svg: string, file: string): string {
  for (const unsupported of ['<image', '<mask', '<filter', '<pattern']) {
    if (svg.includes(unsupported)) {
      throw new Error(`${file}: ${unsupported}> is not handled`)
    }
  }
  let out = svg.replace(
    new RegExp(`(\\s)(${COLOUR_PROPERTIES.join('|')})\\s*=\\s*"([^"]*)"`, 'g'),
    (_, space: string, property: string, value: string) =>
      `${space}${property}="${treatValue(value, file)}"`
  )
  out = out.replace(
    /(\s)style\s*=\s*"([^"]*)"/g,
    (_, space: string, css: string) =>
      `${space}style="${treatDeclarations(css, file)}"`
  )
  out = out.replace(
    /(<style[^>]*>)([\s\S]*?)(<\/style>)/g,
    (_, open: string, css: string, close: string) =>
      `${open}${treatDeclarations(css, file)}${close}`
  )
  out = out.replace(/<stop\b([^>]*?)(\/?)>/g, (tag, attrs: string, end) =>
    /stop-color/.test(attrs)
      ? tag
      : `<stop${attrs} stop-color="${TREATED_BLACK}"${end}>`
  )
  out = out.replace(/<svg\b([^>]*)>/, (tag, attrs: string) =>
    /\sfill\s*=|fill\s*:/.test(attrs)
      ? tag
      : `<svg${attrs} fill="${TREATED_BLACK}">`
  )
  return out
}

function flagFile(code: string) {
  const points = [...code.toUpperCase()].map((letter) =>
    (0x1f1e6 + letter.charCodeAt(0) - 65).toString(16)
  )
  return `third_party/region-flags/waved-svg/emoji_u${points.join('_')}.svg`
}

function emojiFile(codepoint: string) {
  return `2D/svg/emoji_u${codepoint}.svg`
}

async function download(file: string) {
  const cached = path.join(CACHE, file)
  try {
    return await readFile(cached, 'utf8')
  } catch {
    const response = await fetch(`${SOURCE}/${file}`)
    if (!response.ok) {
      throw new Error(`${file}: download failed with ${response.status}`)
    }
    const text = await response.text()
    await mkdir(path.dirname(cached), { recursive: true })
    await writeFile(cached, text)
    return text
  }
}

async function inBatches<T, R>(
  items: T[],
  size: number,
  run: (item: T) => Promise<R>
) {
  const results: R[] = []
  for (let i = 0; i < items.length; i += size) {
    results.push(...(await Promise.all(items.slice(i, i + size).map(run))))
  }
  return results
}

function setViewBox(svg: string, box: Box, width: number, height: number) {
  return svg.replace(/<svg\b([^>]*)>/, (_, attrs: string) => {
    const kept = attrs
      .replace(
        /\s(viewBox|width|height|preserveAspectRatio|x|y)\s*=\s*"[^"]*"/g,
        ''
      )
      .replace(/\sstyle\s*=\s*"[^"]*"/g, '')
    return `<svg${kept} viewBox="${box.x} ${box.y} ${box.width} ${box.height}" width="${width}" height="${height}" preserveAspectRatio="none">`
  })
}

function rasterise(svg: string) {
  return sharp(Buffer.from(svg), { density: 72 }).ensureAlpha()
}

async function alphaBox(svg: string): Promise<Box> {
  const full = { x: 0, y: 0, width: FLAG_VIEWBOX, height: FLAG_VIEWBOX }
  const { data, info } = await rasterise(
    setViewBox(svg, full, FLAG_VIEWBOX, FLAG_VIEWBOX)
  )
    .raw()
    .toBuffer({ resolveWithObject: true })
  let [x0, y0, x1, y1] = [Infinity, Infinity, -1, -1]
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * 4 + 3] > 0) {
        x0 = Math.min(x0, x)
        y0 = Math.min(y0, y)
        x1 = Math.max(x1, x)
        y1 = Math.max(y1, y)
      }
    }
  }
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 }
}

function boxKey(box: Box) {
  return `${box.x},${box.y},${box.width},${box.height}`
}

function contains(outer: Box, inner: Box) {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  )
}

function toWebp(svg: string) {
  return rasterise(svg).webp({ lossless: true, effort: 6 }).toBuffer()
}

function hash(...buffers: Buffer[]) {
  const digest = createHash('sha256')
  for (const buffer of buffers) digest.update(buffer)
  return digest.digest('hex').slice(0, 8)
}

function countryCodes(source: string) {
  return [...source.matchAll(/code: '([A-Z]{2})'/g)].map((match) => match[1])
}

async function main() {
  const countries = countryCodes(
    await readFile(path.join(ROOT, 'src/lib/countries.ts'), 'utf8')
  )

  const flags = await inBatches(countries, 16, async (code) => {
    const file = flagFile(code)
    const svg = treatSvgColours(await download(file), file)
    return { code, svg, box: await alphaBox(svg) }
  })

  const counts = new Map<string, { box: Box; codes: string[] }>()
  for (const flag of flags) {
    const key = boxKey(flag.box)
    const entry = counts.get(key) ?? { box: flag.box, codes: [] }
    entry.codes.push(flag.code)
    counts.set(key, entry)
  }
  const shared = [...counts.values()].sort(
    (a, b) => b.codes.length - a.codes.length
  )[0]
  const box = shared.box
  const misfits = flags.filter((flag) => !contains(box, flag.box))
  const smaller = flags.filter(
    (flag) => contains(box, flag.box) && boxKey(flag.box) !== boxKey(box)
  )

  const aspect = box.width / box.height
  const flagSizes = {
    small: {
      width: FLAG_WIDTHS.small,
      height: Math.round(FLAG_WIDTHS.small / aspect),
    },
    large: {
      width: FLAG_WIDTHS.large,
      height: Math.round(FLAG_WIDTHS.large / aspect),
    },
  }

  for (const dir of ['flags', 'small', 'large']) {
    await rm(path.join(OUTPUT, dir), { recursive: true, force: true })
  }
  for (const dir of ['flags/small', 'flags/large', 'small', 'large']) {
    await mkdir(path.join(OUTPUT, dir), { recursive: true })
  }

  let totalBytes = 0
  const flagFiles: Record<string, string> = {}
  await inBatches(flags, 16, async ({ code, svg }) => {
    const [small, large] = await Promise.all(
      (['small', 'large'] as const).map((size) =>
        toWebp(
          setViewBox(svg, box, flagSizes[size].width, flagSizes[size].height)
        )
      )
    )
    const stem = `${code.toLowerCase()}.${hash(small, large)}`
    await writeFile(path.join(OUTPUT, 'flags/small', `${stem}.webp`), small)
    await writeFile(path.join(OUTPUT, 'flags/large', `${stem}.webp`), large)
    totalBytes += small.length + large.length
    flagFiles[code] = stem
  })

  const emojiFiles: Record<string, string> = {}
  for (const [name, codepoint] of Object.entries(EMOJI)) {
    const file = emojiFile(codepoint)
    const svg = treatSvgColours(await download(file), file)
    const viewBox = svg
      .match(/viewBox="([^"]*)"/)?.[1]
      .split(/[\s,]+/)
      .map(Number)
    if (!viewBox) throw new Error(`${file}: no viewBox`)
    const full = {
      x: viewBox[0],
      y: viewBox[1],
      width: viewBox[2],
      height: viewBox[3],
    }
    const [small, large] = await Promise.all(
      (['small', 'large'] as const).map((size) =>
        toWebp(setViewBox(svg, full, EMOJI_WIDTHS[size], EMOJI_WIDTHS[size]))
      )
    )
    const kebab = name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    const stem = `${kebab}.${hash(small, large)}`
    await writeFile(path.join(OUTPUT, 'small', `${stem}.webp`), small)
    await writeFile(path.join(OUTPUT, 'large', `${stem}.webp`), large)
    totalBytes += small.length + large.length
    emojiFiles[name] = stem
  }

  const sortedFlags = Object.fromEntries(
    Object.entries(flagFiles).sort(([a], [b]) => a.localeCompare(b))
  )
  await writeFile(
    MANIFEST,
    `// Generated by scripts/build-emoji-images.mts. Run \`npm run emoji:build\` instead of editing.

export const NOTO_EMOJI_COMMIT = '${NOTO_COMMIT}'

export const EMOJI_IMAGE_ROOT = '/emoji'

export const FLAG_ASPECT_RATIO = ${Number(aspect.toFixed(4))}

export const FLAG_IMAGE_SIZES = ${JSON.stringify(flagSizes)} as const

export const EMOJI_IMAGE_SIZE = ${JSON.stringify(EMOJI_WIDTHS)} as const

export const FLAG_FILES: Readonly<Record<string, string>> = ${JSON.stringify(sortedFlags)}

export const EMOJI_FILES = ${JSON.stringify(emojiFiles)} as const
`
  )

  await writeFile(path.join(OUTPUT, 'README.md'), readme())

  console.log(`Noto commit ${NOTO_COMMIT}`)
  console.log(
    `Shared flag box ${boxKey(box)} (of ${FLAG_VIEWBOX}), used by ${shared.codes.length} of ${flags.length} flags; aspect ${aspect.toFixed(4)}`
  )
  console.log(
    `Flag sizes ${flagSizes.small.width}×${flagSizes.small.height} and ${flagSizes.large.width}×${flagSizes.large.height}; emoji ${EMOJI_WIDTHS.small} and ${EMOJI_WIDTHS.large}`
  )
  for (const flag of smaller) {
    console.log(`Smaller than the shared box: ${flag.code} ${boxKey(flag.box)}`)
  }
  for (const flag of misfits) {
    console.log(`Cut off by the shared box: ${flag.code} ${boxKey(flag.box)}`)
  }
  console.log(
    `${flags.length} flags and ${Object.keys(EMOJI).length} emoji, ${(totalBytes / 1024).toFixed(1)} KB in total`
  )
}

function readme() {
  return `# Emoji images

The flags and emoji that Yearly draws, from [googlefonts/noto-emoji](https://github.com/googlefonts/noto-emoji) at commit [\`${NOTO_COMMIT}\`](https://github.com/googlefonts/noto-emoji/tree/${NOTO_COMMIT}).

- Flags come from \`third_party/region-flags/waved-svg/\`. The flag designs are in the public domain.
- Other emoji come from \`2D/svg/\`.

Colours adjusted: every colour went through the equivalent of CSS \`filter: saturate(${FILTER.saturate}) contrast(${FILTER.contrast}) brightness(${FILTER.brightness})\`. Flags are cropped to one shared box. Everything is saved as lossless WebP in two sizes.

The images are used under the Apache License, Version 2.0, in [LICENSE](LICENSE).

Rebuild with \`npm run emoji:build\` (\`scripts/build-emoji-images.mts\`).
`
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await main()
}
