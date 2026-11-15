import { VideoSalesEnabledProvider } from '@/components/admin/VideoSalesEnabledProvider'
import { isVideoSalesEnabled } from '@/lib/videos/enabled'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <VideoSalesEnabledProvider enabled={isVideoSalesEnabled()}>
      {children}
    </VideoSalesEnabledProvider>
  )
}
