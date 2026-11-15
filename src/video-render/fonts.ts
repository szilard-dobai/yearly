import '@fontsource-variable/geist/wght.css'
import '@fontsource-variable/newsreader/wght.css'
import '@fontsource-variable/newsreader/wght-italic.css'
import type { CSSProperties } from 'react'
import { cancelRender, continueRender, delayRender } from 'remotion'

const FAMILIES = ['Geist Variable', 'Newsreader Variable']

export const FONT_VARIABLES = {
  '--font-geist-sans': `'${FAMILIES[0]}'`,
  '--font-newsreader': `'${FAMILIES[1]}'`,
} as CSSProperties

export function loadVideoFonts() {
  const handle = delayRender('Loading fonts')
  requestAnimationFrame(() => {
    const faces = [...document.fonts].filter((face) =>
      FAMILIES.includes(face.family.replace(/["']/g, ''))
    )
    if (faces.length === 0) {
      cancelRender(new Error('The video fonts are missing from the bundle'))
      return
    }
    Promise.all(faces.map((face) => face.load())).then(
      () => continueRender(handle),
      (error) => cancelRender(error)
    )
  })
}
