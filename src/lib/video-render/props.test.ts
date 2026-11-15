import { describe, expect, it } from 'vitest'
import { exampleRenderId, loadVideoProps } from './props'

describe('loadVideoProps', () => {
  it('gives example renders the homepage example year', () => {
    const props = loadVideoProps(exampleRenderId(0), {
      kind: 'year',
      theme: 'light',
    })

    expect(props).toMatchObject({ theme: 'light', weekStartsOn: 1 })
    expect(props?.data).toMatchObject({ year: 2026 })
  })

  it('gives the month video the example month', () => {
    const props = loadVideoProps(exampleRenderId(0), {
      kind: 'month',
      theme: 'dark',
    })

    expect(props?.data).toMatchObject({ year: 2026, month: 5 })
  })

  it('has nothing for other renders yet', () => {
    expect(loadVideoProps('order-1', { kind: 'year', theme: 'dark' })).toBe(
      null
    )
  })
})
