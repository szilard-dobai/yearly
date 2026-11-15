import { isAccountsEnabled } from '@/lib/auth/enabled'

export function isVideoSalesEnabled() {
  return process.env.VIDEO_SALES_ENABLED === 'true' && isAccountsEnabled()
}
