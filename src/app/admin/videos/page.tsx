import VideoOrdersAdmin from '@/components/admin/VideoOrdersAdmin'
import { isVideoSalesEnabled } from '@/lib/videos/enabled'
import { notFound } from 'next/navigation'

export default function VideoOrdersAdminPage() {
  if (!isVideoSalesEnabled()) notFound()

  return <VideoOrdersAdmin />
}
