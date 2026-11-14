import { AnimatedSection } from '@/components/AnimatedSection'
import { JsonLd } from '@/components/JsonLd'
import { isAccountsEnabled } from '@/lib/auth/enabled'
import { getFaqs } from '@/lib/faq'

export function Faq() {
  return (
    <section className="py-24" aria-labelledby="faq-heading">
      <JsonLd type="faq" />
      <div className="max-w-3xl mx-auto">
        <AnimatedSection animation="fadeInUpOnView">
          <h2
            id="faq-heading"
            className="text-center mb-16 text-gray-900 dark:text-zinc-100 text-4xl font-serif font-normal"
          >
            Questions about Yearly
          </h2>
        </AnimatedSection>

        <AnimatedSection
          animation="fadeInUpOnView"
          className="bg-white dark:bg-[#141414] rounded-2xl shadow-sm border border-gray-200 dark:border-white/8 divide-y divide-gray-200 dark:divide-white/8"
        >
          {getFaqs(isAccountsEnabled()).map((faq) => (
            <div key={faq.question} className="p-6 sm:p-8">
              <h3 className="mb-2 text-gray-900 dark:text-zinc-100 text-lg font-medium">
                {faq.question}
              </h3>
              <p className="text-gray-600 dark:text-zinc-400 leading-relaxed">
                {faq.answer}
              </p>
            </div>
          ))}
        </AnimatedSection>
      </div>
    </section>
  )
}
