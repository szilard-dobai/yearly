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
