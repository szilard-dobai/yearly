'use client'

import { createContext, type ReactNode, useContext } from 'react'

const VideoSalesEnabledContext = createContext(false)

export function VideoSalesEnabledProvider({
  enabled,
  children,
}: {
  enabled: boolean
  children: ReactNode
}) {
  return (
    <VideoSalesEnabledContext value={enabled}>
      {children}
    </VideoSalesEnabledContext>
  )
}

export function useVideoSalesEnabled() {
  return useContext(VideoSalesEnabledContext)
}
