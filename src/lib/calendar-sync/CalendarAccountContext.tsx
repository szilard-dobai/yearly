'use client'

import { createContext, useContext } from 'react'
import type { SyncAccount, SyncStatus } from './useCalendarSync'

export interface CalendarAccount {
  account: SyncAccount | null
  sessionChecked: boolean
  status: SyncStatus
  ready: boolean
  checkSession: () => void
}

const SIGNED_OUT: CalendarAccount = {
  account: null,
  sessionChecked: true,
  status: 'saved',
  ready: false,
  checkSession: () => {},
}

export const CalendarAccountContext = createContext<CalendarAccount>(SIGNED_OUT)

export function useCalendarAccount() {
  return useContext(CalendarAccountContext)
}
