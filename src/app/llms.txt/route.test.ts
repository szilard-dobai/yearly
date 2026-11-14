import { faqs } from '@/lib/faq'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

describe('GET /llms.txt', () => {
  let text: string
  let contentType: string | null

  beforeAll(async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.yearly.world')
    vi.resetModules()
    const { GET } = await import('./route')
    const response = GET()
    contentType = response.headers.get('content-type')
    text = await response.text()
  })

  afterAll(() => {
    vi.unstubAllEnvs()
  })

  it('serves plain text that starts with the site name', () => {
    expect(contentType).toBe('text/plain; charset=utf-8')
    expect(text.startsWith('# Yearly\n')).toBe(true)
  })

  it('includes every homepage FAQ question and answer', () => {
    for (const { question, answer } of faqs) {
      expect(text).toContain(`### ${question}`)
      expect(text).toContain(answer)
    }
  })

  it('links the public pages with absolute URLs', () => {
    expect(text).toContain('(https://www.yearly.world/)')
    expect(text).toContain('(https://www.yearly.world/create)')
    expect(text).toContain('(https://www.yearly.world/privacy)')
  })
})

describe('GET /llms.txt once accounts are on', () => {
  afterAll(() => {
    vi.unstubAllEnvs()
  })

  it('says an account is optional and uses the account FAQs', async () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.yearly.world')
    vi.stubEnv('ACCOUNTS_ENABLED', 'true')
    vi.resetModules()
    const { GET } = await import('./route')
    const { getFaqs } = await import('@/lib/faq')
    const text = await GET().text()

    expect(text).toContain('An account is optional.')
    expect(text).not.toContain('with no account and nothing to install')
    for (const { question } of getFaqs(true)) {
      expect(text).toContain(`### ${question}`)
    }
  })
})
