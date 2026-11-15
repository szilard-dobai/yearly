'use client'

import { createContext, type ReactNode, useContext } from 'react'

export interface VideoSales {
  enabled: boolean
  googleSignIn: boolean
}

const VideoSalesContext = createContext<VideoSales>({
  enabled: false,
  googleSignIn: false,
})

export function VideoSalesProvider({
  value,
  children,
}: {
  value: VideoSales
  children: ReactNode
}) {
  return <VideoSalesContext value={value}>{children}</VideoSalesContext>
}

export function useVideoSales() {
  return useContext(VideoSalesContext)
}
