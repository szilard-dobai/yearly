import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import sharp from 'sharp'
import LogoSvg from '@/assets/logo.svg'
import { FLAG_HEIGHT_EM, FLAG_WIDTH_EM, getFlagImageSrc } from '@/lib/emoji'

export const alt =
  'Yearly logo, the line "Your year, at a glance." and a row of country flags'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

const FLAGS = ['RO', 'GB', 'FR', 'IT', 'JP', 'AU']
const FLAG_SIZE = 44

async function loadFlag(code: string) {
  const src = getFlagImageSrc(code, 'large')
  if (!src) throw new Error(`No flag image for ${code}`)
  const webp = await readFile(path.join(process.cwd(), 'public', src))
  const png = await sharp(webp).png().toBuffer()
  return `data:image/png;base64,${png.toString('base64')}`
}

async function loadGoogleFont(font: string) {
  const url = new URL('https://fonts.googleapis.com/css2')
  url.searchParams.set('family', font)

  const css = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1',
    },
  }).then((res) => res.text())

  const fontUrl = css.match(
    /src: url\((.+)\) format\('(opentype|truetype)'\)/
  )?.[1]

  if (!fontUrl) {
    throw new Error('Failed to load font')
  }

  return fetch(fontUrl).then((res) => res.arrayBuffer())
}

export default async function Image() {
  const [newsreaderFont, flags] = await Promise.all([
    loadGoogleFont('Newsreader:wght@400'),
    Promise.all(FLAGS.map(loadFlag)),
  ])

  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(to bottom right, #f9fafb, #fafaf9)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 32,
          }}
        >
          <LogoSvg width={48} height={48} color="#111827" />
          <span
            style={{
              fontSize: 36,
              fontWeight: 400,
              color: '#111827',
              fontFamily: 'Newsreader',
              letterSpacing: '-0.02em',
              paddingTop: 8,
            }}
          >
            Yearly
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 72,
            fontWeight: 400,
            color: '#111827',
            marginBottom: 24,
            fontFamily: 'Newsreader',
            letterSpacing: '-0.02em',
            textAlign: 'center',
          }}
        >
          Your year, at a glance.
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 24,
            color: '#4b5563',
            textAlign: 'center',
            maxWidth: 700,
            lineHeight: 1.5,
          }}
        >
          Create a visual calendar of your travels and share it anywhere
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20 + FLAG_SIZE * (1 - FLAG_WIDTH_EM),
            marginTop: 48,
            height: FLAG_SIZE,
          }}
        >
          {flags.map((src, index) => (
            <img
              key={FLAGS[index]}
              src={src}
              alt=""
              width={Math.round(FLAG_SIZE * FLAG_WIDTH_EM)}
              height={Math.round(FLAG_SIZE * FLAG_HEIGHT_EM)}
            />
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: 48,
            padding: '12px 28px',
            backgroundColor: '#111827',
            color: 'white',
            borderRadius: 9999,
            fontSize: 18,
            fontWeight: 500,
          }}
        >
          Create your Yearly
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: 'Newsreader',
          data: newsreaderFont,
          style: 'normal',
          weight: 400,
        },
      ],
    }
  )
}
