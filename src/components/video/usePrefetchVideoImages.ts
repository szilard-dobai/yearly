import { getEmojiImageSrc, getFlagImageSrc, MEDAL_EMOJI } from '@/lib/emoji'
import { useEffect } from 'react'
import { prefetch } from 'remotion'

export function usePrefetchVideoImages(countries: string[]) {
  const key = countries.join(',')

  useEffect(() => {
    const sources = [
      ...key
        .split(',')
        .filter(Boolean)
        .map((code) => getFlagImageSrc(code, 'large')),
      ...MEDAL_EMOJI.map((name) => getEmojiImageSrc(name, 'large')),
    ].filter((src) => src !== null)
    const prefetched = sources.map((src) => prefetch(src))
    return () => prefetched.forEach(({ free }) => free())
  }, [key])
}
