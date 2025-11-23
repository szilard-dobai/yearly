'use client'

import { motion } from 'motion/react'
import Image, { ImageProps } from 'next/image'
import { useState } from 'react'

export function CalendarMockup() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="w-full max-w-2xl mx-auto"
    >
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200 p-8">
        <ImageWithFallback
          src="/example.jpg"
          alt="Yearly calendar showing 2025 with country flags marking travel dates"
          className="w-full h-auto"
        />
      </div>

      {/* Caption */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="text-center mt-6 text-gray-600"
      >
        Your entire year of travels in one beautiful image
      </motion.p>
    </motion.div>
  )
}

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

function ImageWithFallback({
  src,
  alt,
  style,
  className,
  ...rest
}: ImageProps) {
  const [didError, setDidError] = useState(false)

  const handleError = () => {
    setDidError(true)
  }

  return didError ? (
    <div
      className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
      style={style}
    >
      <div className="flex items-center justify-center w-full h-full">
        <Image
          src={ERROR_IMG_SRC}
          alt="Error loading image"
          {...rest}
          data-original-url={src}
        />
      </div>
    </div>
  ) : (
    <Image
      src={src}
      alt={alt}
      className={className}
      style={style}
      width={3132}
      height={2400}
      {...rest}
      onError={handleError}
    />
  )
}
