import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import ExportWatermark from './ExportWatermark'

describe('ExportWatermark', () => {
  it('signs the image with the site address', () => {
    const { container } = render(<ExportWatermark />)
    const watermark = container.querySelector('[data-export-watermark]')

    expect(watermark).toHaveTextContent('made with')
    expect(watermark).toHaveTextContent('yearly.world')
    expect(watermark?.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true'
    )
  })
})
