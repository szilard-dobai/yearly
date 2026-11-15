import { beforeEach, describe, expect, it, vi } from 'vitest'
import { exampleRenderId, loadVideoProps } from './props'

const getRenderJob = vi.fn()

vi.mock('@/lib/db', () => ({ db: {} }))
vi.mock('@/lib/videos/orders', () => ({
  getRenderJob: (...args: unknown[]) => getRenderJob(...args),
}))

describe('loadVideoProps', () => {
  beforeEach(() => getRenderJob.mockReset().mockResolvedValue(null))

  it('gives example renders the homepage example year', async () => {
    const props = await loadVideoProps(exampleRenderId(0), {
      kind: 'year',
      theme: 'light',
    })

    expect(props).toMatchObject({ theme: 'light', weekStartsOn: 1 })
    expect(props?.data).toMatchObject({ year: 2026 })
    expect(getRenderJob).not.toHaveBeenCalled()
  })

  it('gives the month video the example month', async () => {
    const props = await loadVideoProps(exampleRenderId(0), {
      kind: 'month',
      theme: 'dark',
    })

    expect(props?.data).toMatchObject({ year: 2026, month: 5 })
  })

  it("builds an order's video from the trips saved with its render", async () => {
    getRenderJob.mockResolvedValue({
      order: { year: 2026, month: 2 },
      render: {
        data: {
          days: { '2026-03-01': ['FR'], '2026-03-02': ['FR', 'DE'] },
          weekStartsOn: 0,
        },
      },
    })

    const props = await loadVideoProps('render-1', {
      kind: 'month',
      theme: 'dark',
    })

    expect(props).toMatchObject({ theme: 'dark', weekStartsOn: 0 })
    expect(props?.data).toMatchObject({
      year: 2026,
      month: 2,
      countries: ['FR', 'DE'],
    })
  })

  it('has nothing for an unknown render', async () => {
    expect(
      await loadVideoProps('render-1', { kind: 'year', theme: 'dark' })
    ).toBe(null)
  })
})
