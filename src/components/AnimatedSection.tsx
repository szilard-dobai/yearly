'use client'

import {
  fadeInLeftOnViewWithDelay,
  fadeInUp,
  fadeInUpOnView,
  fadeInUpOnViewWithDelay,
} from '@/lib/animations'
import { motion } from 'motion/react'
import type { PropsWithChildren } from 'react'

type AnimationType =
  | 'fadeInUp'
  | 'fadeInUpOnView'
  | 'fadeInUpOnViewWithDelay'
  | 'fadeInLeftOnViewWithDelay'

export function AnimatedSection({
  animation,
  delay = 0,
  className,
  children,
}: PropsWithChildren<{
  animation: AnimationType
  delay?: number
  className?: string
}>) {
  const getAnimationProps = () => {
    switch (animation) {
      case 'fadeInUp':
        return fadeInUp
      case 'fadeInUpOnView':
        return fadeInUpOnView
      case 'fadeInUpOnViewWithDelay':
        return fadeInUpOnViewWithDelay(delay)
      case 'fadeInLeftOnViewWithDelay':
        return fadeInLeftOnViewWithDelay(delay)
      default:
        return fadeInUp
    }
  }

  return (
    <motion.div {...getAnimationProps()} className={className}>
      {children}
    </motion.div>
  )
}
