import { AnimatedSection } from '@/components/AnimatedSection'
import { HOMEPAGE_EXAMPLES } from '@/lib/homepage-examples'
import Image from 'next/image'
import type { CSSProperties } from 'react'

const columns = HOMEPAGE_EXAMPLES.map(
  ({ width, height }) => `minmax(0, ${(width / height).toFixed(4)}fr)`
).join(' ')

export function HomepageExamples() {
  return (
    <section className="py-24" aria-labelledby="examples-heading">
      <AnimatedSection
        animation="fadeInUpOnView"
        className="text-center max-w-2xl mx-auto mb-12"
      >
        <h2
          id="examples-heading"
          className="mb-4 text-gray-900 dark:text-zinc-100 text-4xl font-serif font-normal text-balance"
        >
          What your Yearly looks like
        </h2>
        <p className="text-gray-600 dark:text-zinc-400 text-lg leading-relaxed">
          Export your full year, a single month or your travel stats as an
          image.
        </p>
      </AnimatedSection>

      <ul
        className="-mx-3 flex snap-x snap-mandatory scroll-px-3 gap-4 overflow-x-auto px-3 pb-4 md:mx-auto md:grid md:max-w-5xl md:grid-cols-(--example-columns) md:gap-8 md:overflow-visible md:px-0"
        style={{ '--example-columns': columns } as CSSProperties}
      >
        {HOMEPAGE_EXAMPLES.map((example, idx) => (
          <li
            key={example.src}
            className="w-[78%] shrink-0 snap-start md:w-auto"
          >
            <AnimatedSection
              animation="fadeInUpOnViewWithDelay"
              delay={idx * 0.1}
            >
              <figure>
                <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-white/8 shadow-lg dark:shadow-[0_0_40px_rgba(255,255,255,0.06)]">
                  <Image
                    src={example.src}
                    alt={example.alt}
                    width={example.width}
                    height={example.height}
                    sizes="(min-width: 1024px) 350px, (min-width: 768px) 34vw, 78vw"
                    loading="lazy"
                    className="block w-full h-auto"
                  />
                </div>
                <figcaption className="mt-4 text-center text-gray-600 dark:text-zinc-400">
                  {example.caption}
                </figcaption>
              </figure>
            </AnimatedSection>
          </li>
        ))}
      </ul>
    </section>
  )
}
