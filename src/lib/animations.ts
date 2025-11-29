import type { Variants, HTMLMotionProps } from 'motion/react'

type MotionProps = Pick<
  HTMLMotionProps<'div'>,
  'initial' | 'animate' | 'whileInView' | 'viewport' | 'transition'
>

export const fadeInUp: MotionProps = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
}

export const fadeInUpOnView: MotionProps = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
}

export const fadeInLeftOnView: MotionProps = {
  initial: { opacity: 0, x: -20 },
  whileInView: { opacity: 1, x: 0 },
  viewport: { once: true },
  transition: { duration: 0.5 },
}

export function fadeInUpOnViewWithDelay(delay: number): MotionProps {
  return {
    ...fadeInUpOnView,
    transition: { ...fadeInUpOnView.transition, delay },
  }
}

export function fadeInLeftOnViewWithDelay(delay: number): MotionProps {
  return {
    ...fadeInLeftOnView,
    transition: { ...fadeInLeftOnView.transition, delay },
  }
}

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}
