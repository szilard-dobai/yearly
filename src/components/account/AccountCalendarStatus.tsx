'use client'

import { createContext, type ReactNode, useContext, useState } from 'react'

export type AccountCalendarStatus = 'loading' | 'saved' | 'error'

const AccountCalendarStatusContext = createContext<{
  status: AccountCalendarStatus
  setStatus: (status: AccountCalendarStatus) => void
} | null>(null)

export function AccountCalendarStatusProvider({
  children,
}: {
  children: ReactNode
}) {
  const [status, setStatus] = useState<AccountCalendarStatus>('loading')
  return (
    <AccountCalendarStatusContext value={{ status, setStatus }}>
      {children}
    </AccountCalendarStatusContext>
  )
}

export function useAccountCalendarStatus(): AccountCalendarStatus {
  return useContext(AccountCalendarStatusContext)?.status ?? 'saved'
}

export function useReportAccountCalendarStatus() {
  return useContext(AccountCalendarStatusContext)?.setStatus
}
