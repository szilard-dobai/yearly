'use client'

import type { HomepageExample } from '@/lib/homepage-examples'
import { useResolvedColorScheme } from '@/lib/hooks/useResolvedColorScheme'
import Image from 'next/image'

const sizes = '(min-width: 1024px) 350px, (min-width: 768px) 34vw, 78vw'
const variants = ['light', 'dark'] as const

export function HomepageExampleImage({
  example,
}: {
  example: HomepageExample
}) {
  const colorScheme = useResolvedColorScheme()

  return (
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
          className={colorScheme === variant ? 'block w-full h-auto' : 'hidden'}
        />
      ))}
    </div>
  )
}
