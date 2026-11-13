'use client'

import { createContext, type ReactNode, useContext } from 'react'

const AccountsEnabledContext = createContext(false)

export function AccountsEnabledProvider({
  enabled,
  children,
}: {
  enabled: boolean
  children: ReactNode
}) {
  return (
    <AccountsEnabledContext value={enabled}>{children}</AccountsEnabledContext>
  )
}

export function useAccountsEnabled() {
  return useContext(AccountsEnabledContext)
}
