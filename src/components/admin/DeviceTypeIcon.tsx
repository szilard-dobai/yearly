import type { DeviceType } from '@/lib/tracking/types'
import { Monitor, Smartphone, Tablet } from 'lucide-react'

const DEVICE_ICONS = {
  mobile: Smartphone,
  tablet: Tablet,
  desktop: Monitor,
} as const

export default function DeviceTypeIcon({
  type,
  className = 'size-3.5',
}: {
  type?: DeviceType
  className?: string
}) {
  if (!type) return null
  const Icon = DEVICE_ICONS[type]
  return <Icon aria-hidden="true" className={className} />
}
