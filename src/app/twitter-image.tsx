import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'Yearly - Visualize Your Travel Year in a Beautiful Calendar'
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = 'image/png'

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#000',
          backgroundImage:
            'radial-gradient(circle at 25px 25px, #111 2%, transparent 0%), radial-gradient(circle at 75px 75px, #111 2%, transparent 0%)',
          backgroundSize: '100px 100px',
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
          {/* Calendar Icon */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 30,
            }}
          >
            <svg
              width="80"
              height="80"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="4"
                y="6"
                width="32"
                height="28"
                rx="3"
                stroke="white"
                strokeWidth="2"
                fill="none"
              />
              <line
                x1="4"
                y1="14"
                x2="36"
                y2="14"
                stroke="white"
                strokeWidth="2"
              />
              <line
                x1="12"
                y1="6"
                x2="12"
                y2="2"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1="28"
                y1="6"
                x2="28"
                y2="2"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="12" cy="19" r="1.5" fill="white" />
              <circle cx="20" cy="19" r="1.5" fill="white" />
              <circle cx="28" cy="19" r="1.5" fill="white" />
              <circle cx="12" cy="24" r="1.5" fill="white" />
              <circle cx="20" cy="24" r="1.5" fill="white" />
              <circle cx="28" cy="24" r="1.5" fill="white" />
              <circle cx="12" cy="29" r="1.5" fill="white" />
              <circle cx="20" cy="29" r="1.5" fill="white" />
              <circle cx="28" cy="29" r="1.5" fill="white" />
            </svg>
          </div>

          {/* Title */}
          <div
            style={{
              display: 'flex',
              fontSize: 72,
              fontWeight: 400,
              color: 'white',
              marginBottom: 20,
              fontFamily: 'serif',
              letterSpacing: '-0.02em',
            }}
          >
            Yearly
          </div>

          {/* Tagline */}
          <div
            style={{
              display: 'flex',
              fontSize: 32,
              color: '#9ca3af',
              textAlign: 'center',
              maxWidth: 800,
              lineHeight: 1.4,
            }}
          >
            Your year, at a glance.
          </div>

          {/* Subtitle */}
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              color: '#6b7280',
              textAlign: 'center',
              maxWidth: 700,
              marginTop: 20,
              lineHeight: 1.5,
            }}
          >
            Create a beautiful visual calendar of your travels with country
            flags
          </div>

          {/* Sample flags */}
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginTop: 40,
              fontSize: 48,
            }}
          >
            <span>🇫🇷</span>
            <span>🇯🇵</span>
            <span>🇧🇷</span>
            <span>🇦🇺</span>
            <span>🇮🇹</span>
            <span>🇬🇧</span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  )
}
