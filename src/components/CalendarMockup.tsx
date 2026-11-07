'use client'

import { HERO_IMAGE } from '@/lib/homepage-examples'
import {
  DARK_QUERY,
  useResolvedColorScheme,
  useSystemColorScheme,
} from '@/lib/hooks/useResolvedColorScheme'
import { motion } from 'motion/react'
import Image, { getImageProps } from 'next/image'
import { useState } from 'react'
import { preload } from 'react-dom'

export function CalendarMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="bg-white dark:bg-black rounded-2xl shadow-2xl dark:shadow-[0_0_40px_rgba(255,255,255,0.06)] overflow-hidden border border-gray-200 dark:border-white/8 p-8">
        <HeroImage />
      </div>

      {/* Caption */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="text-center mt-6 text-gray-600 dark:text-zinc-400"
      >
        Your entire year of travels in one beautiful image
      </motion.p>
    </motion.div>
  )
}

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

const HERO_SIZES =
  '(min-width: 768px) 606px, (min-width: 640px) 550px, calc(100vw - 90px)'
const LIGHT_QUERY = `not all and ${DARK_QUERY}`

function heroImageProps(variant: 'light' | 'dark') {
  const { src, width, height } = HERO_IMAGE[variant]
  return getImageProps({
    src,
    width,
    height,
    alt: HERO_IMAGE.alt,
    sizes: HERO_SIZES,
    loading: 'eager',
    fetchPriority: 'high',
  }).props
}

const light = heroImageProps('light')
const dark = heroImageProps('dark')

function HeroImage() {
  const colorScheme = useResolvedColorScheme()
  const systemColorScheme = useSystemColorScheme()
  const [didError, setDidError] = useState(false)

  preload(light.src, {
    as: 'image',
    imageSrcSet: light.srcSet,
    imageSizes: light.sizes,
    fetchPriority: 'high',
    media: LIGHT_QUERY,
  })
  preload(dark.src, {
    as: 'image',
    imageSrcSet: dark.srcSet,
    imageSizes: dark.sizes,
    fetchPriority: 'high',
    media: DARK_QUERY,
  })

  if (didError) {
    return (
      <div
        className="flex items-center justify-center bg-gray-100 dark:bg-zinc-800"
        style={{ aspectRatio: `${light.width} / ${light.height}` }}
      >
        <Image
          src={ERROR_IMG_SRC}
          alt="Error loading image"
          width={88}
          height={88}
        />
      </div>
    )
  }

  const override =
    colorScheme && colorScheme !== systemColorScheme ? colorScheme : null
  const darkMedia =
    override === 'dark' ? 'all' : override === 'light' ? 'not all' : DARK_QUERY

  return (
    <picture>
      <source
        media={darkMedia}
        srcSet={dark.srcSet}
        sizes={dark.sizes}
        width={dark.width}
        height={dark.height}
      />
      <img
        {...light}
        alt={HERO_IMAGE.alt}
        className="w-full h-auto"
        onError={() => setDidError(true)}
      />
    </picture>
  )
}
