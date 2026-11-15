import { useEffect, useRef, useState } from 'react'

export function useNearViewport<T extends Element>() {
  const ref = useRef<T>(null)
  const [isNear, setIsNear] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || isNear) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsNear(true)
      },
      { rootMargin: '800px' }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [isNear])

  return { ref, isNear }
}

export function usePreloadWhenIdle(load: () => Promise<unknown>) {
  useEffect(() => {
    const preload = () => void load()
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(preload, { timeout: 3000 })
      return () => window.cancelIdleCallback(id)
    }
    const id = setTimeout(preload, 2000)
    return () => clearTimeout(id)
  }, [load])
}
