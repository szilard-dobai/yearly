'use client'

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { HomepageExample } from '@/lib/homepage-examples'
import { useResolvedColorScheme } from '@/lib/hooks/useResolvedColorScheme'
import { Expand, XIcon } from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

const sizes = '(min-width: 1024px) 350px, (min-width: 768px) 34vw, 78vw'
const variants = ['light', 'dark'] as const

export function HomepageExampleImage({
  example,
}: {
  example: HomepageExample
}) {
  const colorScheme = useResolvedColorScheme()
  const [open, setOpen] = useState(false)
  const full = example[colorScheme ?? 'light']

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="group relative block w-full cursor-zoom-in overflow-hidden rounded-2xl border border-gray-200 shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 dark:border-white/8 dark:shadow-[0_0_40px_rgba(255,255,255,0.06)] dark:focus-visible:ring-zinc-100 dark:focus-visible:ring-offset-[#0a0a0a]"
        >
          <div
            style={{
              aspectRatio: `${example.light.width} / ${example.light.height}`,
            }}
          >
            {variants.map((variant) => (
              <Image
                key={variant}
                src={example[variant].src}
                alt={example.alt}
                width={example[variant].width}
                height={example[variant].height}
                sizes={sizes}
                loading="lazy"
                data-variant={variant}
                className={
                  colorScheme === variant ? 'block w-full h-auto' : 'hidden'
                }
              />
            ))}
          </div>
          <span
            aria-hidden
            className="absolute right-3 bottom-3 flex size-8 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 pointer-coarse:opacity-100"
          >
            <Expand className="size-4" />
          </span>
          <span className="sr-only">Open full size</span>
        </button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        overlayClassName="bg-black/80"
        aria-describedby={undefined}
        onClick={() => setOpen(false)}
        className="w-auto max-w-none cursor-zoom-out gap-0 overflow-hidden rounded-2xl border-0 bg-transparent p-0 shadow-none"
      >
        <DialogTitle className="sr-only">{example.caption} example</DialogTitle>
        <div
          className="relative"
          style={{
            height: `min(calc(100dvh - 2rem), calc((100vw - 2rem) * ${full.height} / ${full.width}))`,
            aspectRatio: `${full.width} / ${full.height}`,
          }}
        >
          <Image
            src={full.src}
            alt=""
            width={full.width}
            height={full.height}
            sizes={sizes}
            className="absolute inset-0 size-full"
          />
          <Image
            src={full.src}
            alt={example.alt}
            width={full.width}
            height={full.height}
            unoptimized
            data-full-size
            className="absolute inset-0 size-full"
          />
        </div>
        <DialogClose className="absolute top-3 right-3 flex size-9 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white outline-none transition-colors hover:bg-black/80 focus-visible:ring-2 focus-visible:ring-white">
          <XIcon className="size-5" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  )
}
