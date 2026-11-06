function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <rect
        x="4"
        y="6"
        width="32"
        height="28"
        rx="3"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <line
        x1="4"
        y1="14"
        x2="36"
        y2="14"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      {[12, 20, 28].flatMap((cx) =>
        [19, 24, 29].map((cy) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r="1.75"
            fill="currentColor"
          />
        ))
      )}
    </svg>
  )
}

export default function ExportWatermark() {
  return (
    <div
      data-export-watermark
      className="hidden mt-6 pt-4 border-t border-gray-200 dark:border-white/10"
    >
      <p className="flex items-center justify-center gap-[0.4em] leading-none">
        <span className="text-[0.62em] text-gray-500 dark:text-zinc-400">
          made with
        </span>
        <span className="flex items-center gap-[0.22em] font-semibold tracking-tight text-gray-900 dark:text-zinc-100">
          <LogoMark className="size-[1.15em] shrink-0" />
          yearly.world
        </span>
      </p>
    </div>
  )
}
