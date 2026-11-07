import { useCallback, useRef, useState, type ReactElement } from 'react'
import { useSettings, type Settings } from '@/lib/contexts/SettingsContext'
import type { ExportFormat } from '@/lib/export-canvas'
import { renderExportImage } from '@/lib/export-render'
import { useStatusFeedback, type StatusState } from './useStatusFeedback'

export interface ExportLayoutOptions {
  format: ExportFormat
  flagDisplayMode: Settings['flagDisplayMode']
  weekStartsOn: Settings['weekStartsOn']
}

interface UseExportImageOptions {
  layout: (options: ExportLayoutOptions) => ReactElement
  label: string
}

export interface UseExportImageReturn {
  start: (track: (format: ExportFormat) => void) => Promise<void>
  changeFormat: (format: ExportFormat) => Promise<void>
  format: ExportFormat
  status: StatusState
  previewOpen: boolean
  setPreviewOpen: (open: boolean) => void
  imageDataUrl: string | null
}

function isDarkMode(colorScheme: Settings['colorScheme']) {
  if (colorScheme === 'dark') return true
  if (colorScheme === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useExportImage({
  layout,
  label,
}: UseExportImageOptions): UseExportImageReturn {
  const { status, setLoading, setIdle, setError } = useStatusFeedback()
  const { settings, actions } = useSettings()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [image, setImage] = useState<{
    dataUrl: string
    format: ExportFormat
  } | null>(null)
  const latestRequest = useRef(0)

  const render = useCallback(
    async (format: ExportFormat) => {
      const request = ++latestRequest.current
      setLoading()
      try {
        const dataUrl = await renderExportImage(
          layout({
            format,
            flagDisplayMode: settings.flagDisplayMode,
            weekStartsOn: settings.weekStartsOn,
          }),
          format,
          isDarkMode(settings.colorScheme) ? 'dark' : 'light'
        )
        if (request !== latestRequest.current) return
        setImage({ dataUrl, format })
        setPreviewOpen(true)
        setIdle()
      } catch (error) {
        console.error(`${label} export failed:`, error)
        if (request === latestRequest.current) setError()
      }
    },
    [
      layout,
      label,
      settings.flagDisplayMode,
      settings.weekStartsOn,
      settings.colorScheme,
      setLoading,
      setIdle,
      setError,
    ]
  )

  const start = useCallback(
    (track: (format: ExportFormat) => void) => {
      track(settings.exportFormat)
      return render(settings.exportFormat)
    },
    [render, settings.exportFormat]
  )

  const changeFormat = useCallback(
    (format: ExportFormat) => {
      actions.updateSettings({ exportFormat: format })
      return render(format)
    },
    [actions, render]
  )

  return {
    start,
    changeFormat,
    format: image?.format ?? settings.exportFormat,
    status,
    previewOpen,
    setPreviewOpen,
    imageDataUrl: image?.dataUrl ?? null,
  }
}
