import Link from 'next/link'

export function YearlyLogo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-3 ${className}`}>
      <div className="relative w-10 h-10 mb-3">
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          <rect
            x="4"
            y="8"
            width="32"
            height="28"
            rx="3"
            stroke="currentColor"
            strokeWidth="2"
            fill="none"
          />

          <line
            x1="4"
            y1="14"
            x2="36"
            y2="14"
            stroke="currentColor"
            strokeWidth="2"
          />

          <circle cx="12" cy="19" r="1.5" fill="currentColor" />
          <circle cx="20" cy="19" r="1.5" fill="currentColor" />
          <circle cx="28" cy="19" r="1.5" fill="currentColor" />

          <circle cx="12" cy="24" r="1.5" fill="currentColor" />
          <circle cx="20" cy="24" r="1.5" fill="currentColor" />
          <circle cx="28" cy="24" r="1.5" fill="currentColor" />

          <circle cx="12" cy="29" r="1.5" fill="currentColor" />
          <circle cx="20" cy="29" r="1.5" fill="currentColor" />
          <circle cx="28" cy="29" r="1.5" fill="currentColor" />

          <circle cx="12" cy="34" r="1.5" fill="currentColor" />
          <circle cx="20" cy="34" r="1.5" fill="currentColor" />
          <circle cx="28" cy="34" r="1.5" fill="currentColor" />
        </svg>
      </div>

      <span className="text-3xl font-serif font-normal tracking-tight">
        Yearly
      </span>
    </Link>
  )
}
