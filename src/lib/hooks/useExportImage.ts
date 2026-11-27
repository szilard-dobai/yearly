import { useCallback, useRef, useState, type ReactElement } from 'react'
import type { EXPORT_BACKGROUND } from '@/lib/constants'
import { useSettings, type Settings } from '@/lib/contexts/SettingsContext'
import type { ExportFormat } from '@/lib/export-canvas'
import { renderExportImage } from '@/lib/export-render'
import { useStatusFeedback, type StatusState } from './useStatusFeedback'

export type ExportTheme = keyof typeof EXPORT_BACKGROUND

export interface ExportLayoutOptions {
  format: ExportFormat
  weekStartsOn: Settings['weekStartsOn']
  theme: ExportTheme
}

interface UseExportImageOptions {
  layout: (options: ExportLayoutOptions) => ReactElement | Promise<ReactElement>
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
        const theme = isDarkMode(settings.colorScheme) ? 'dark' : 'light'
        const element = await layout({
          format,
          weekStartsOn: settings.weekStartsOn,
          theme,
        })
        if (request !== latestRequest.current) return
        const dataUrl = await renderExportImage(element, format, theme)
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
