import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AdminNav from './AdminNav'
import { VideoSalesProvider } from '@/components/video/VideoSalesProvider'

vi.mock('next/navigation', () => ({ usePathname: () => '/admin/videos' }))

function renderNav(videoSales: boolean) {
  return render(
    <VideoSalesProvider value={{ enabled: videoSales, googleSignIn: false }}>
      <AdminNav />
    </VideoSalesProvider>
  )
}

describe('AdminNav', () => {
  it('links to video orders while video sales are on', () => {
    renderNav(true)

    expect(screen.getByRole('link', { name: 'Videos' })).toHaveAttribute(
      'aria-current',
      'page'
    )
  })

  it('leaves video orders out while video sales are off', () => {
    renderNav(false)

    expect(screen.getAllByRole('link').map((link) => link.textContent)).toEqual(
      ['Analytics', 'Feedback']
    )
  })
})
