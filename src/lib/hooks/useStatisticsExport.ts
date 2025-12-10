import { useState, useCallback, RefObject } from 'react'
import { toJpeg } from 'html-to-image'
import { useStatusFeedback } from './useStatusFeedback'
import { useSettings } from '@/lib/contexts/SettingsContext'
import { trackEvent } from '@/lib/tracking'
import type { CalendarData } from '@/lib/types'

interface UseStatisticsExportOptions {
  statisticsRef: RefObject<HTMLDivElement | null>
  calendarData: CalendarData
  year: number
}

interface UseStatisticsExportReturn {
  exportStatistics: () => Promise<void>
  status: 'idle' | 'loading' | 'success' | 'error'
  previewOpen: boolean
  setPreviewOpen: (open: boolean) => void
  imageDataUrl: string | null
  filename: string
}

export function useStatisticsExport({
  statisticsRef,
  calendarData,
  year,
}: UseStatisticsExportOptions): UseStatisticsExportReturn {
  const { status, setLoading, setIdle, setError } = useStatusFeedback()
  const { settings } = useSettings()
  const [previewOpen, setPreviewOpen] = useState(false)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)

  const filename = `my-stats-${year}.jpg`

  const isDarkMode = useCallback(() => {
    if (settings.colorScheme === 'dark') return true
    if (settings.colorScheme === 'light') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }, [settings.colorScheme])

  const exportStatistics = useCallback(async () => {
    if (!statisticsRef.current) {
      setError()
      return
    }

    trackEvent('statistics_export_click', {
      year,
      visitCount: calendarData.visits.length,
    })

    setLoading()

    let clonedElement: HTMLDivElement | null = null

    try {
      const element = statisticsRef.current

      clonedElement = element.cloneNode(true) as HTMLDivElement

      const exportWidth = 1200
      const exportHeight = 1739

      clonedElement.style.position = 'absolute'
      clonedElement.style.left = '0'
      clonedElement.style.top = '0'
      clonedElement.style.width = `${exportWidth}px`
      clonedElement.style.height = `${exportHeight}px`
      clonedElement.style.maxWidth = `${exportWidth}px`
      clonedElement.style.transform = 'none'
      clonedElement.style.zIndex = '-1000'
      clonedElement.style.pointerEvents = 'none'
      clonedElement.style.opacity = '0'
      clonedElement.style.padding = '4rem 3rem'
      clonedElement.style.boxSizing = 'border-box'
      clonedElement.style.display = 'flex'
      clonedElement.style.flexDirection = 'column'

      const darkMode = isDarkMode()
      clonedElement.style.backgroundColor = darkMode ? '#0a0a0a' : '#fafafa'

      if (darkMode) {
        clonedElement.style.color = '#ffffff'
      }

      const watermark = clonedElement.querySelector(
        '[data-export-watermark]'
      ) as HTMLElement
      if (watermark) {
        watermark.style.display = 'block'
        watermark.style.marginTop = 'auto'
        watermark.style.paddingTop = '2rem'
        const watermarkText = watermark.querySelector('p') as HTMLElement
        if (watermarkText) {
          watermarkText.style.fontSize = '1.5rem'
        }
      }

      const allElements = clonedElement.querySelectorAll('*')
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement
        if (htmlEl.classList.contains('text-6xl')) {
          htmlEl.style.fontSize = '7rem'
        }
        if (htmlEl.classList.contains('text-4xl')) {
          htmlEl.style.fontSize = '5rem'
        }
        if (htmlEl.classList.contains('text-3xl')) {
          htmlEl.style.fontSize = '4rem'
        }
        if (htmlEl.classList.contains('text-2xl')) {
          htmlEl.style.fontSize = '3rem'
        }
        if (htmlEl.classList.contains('text-xl')) {
          htmlEl.style.fontSize = '2rem'
        }
        if (htmlEl.classList.contains('text-lg')) {
          htmlEl.style.fontSize = '1.75rem'
        }
        if (htmlEl.classList.contains('text-base')) {
          htmlEl.style.fontSize = '1.5rem'
        }
        if (htmlEl.classList.contains('text-sm')) {
          htmlEl.style.fontSize = '1.25rem'
        }
        if (htmlEl.classList.contains('rounded-2xl')) {
          htmlEl.style.borderRadius = '2rem'
        }
        if (htmlEl.classList.contains('p-5')) {
          htmlEl.style.padding = '2rem'
        }
        if (htmlEl.classList.contains('p-4')) {
          htmlEl.style.padding = '1.75rem'
        }
        if (htmlEl.classList.contains('gap-4')) {
          htmlEl.style.gap = '1.5rem'
        }
        if (htmlEl.classList.contains('mb-4')) {
          htmlEl.style.marginBottom = '1.5rem'
        }
        if (htmlEl.classList.contains('mb-8')) {
          htmlEl.style.marginBottom = '2.5rem'
        }
        if (htmlEl.classList.contains('space-y-3')) {
          const children = htmlEl.children
          for (let i = 1; i < children.length; i++) {
            ;(children[i] as HTMLElement).style.marginTop = '1.25rem'
          }
        }
        if (htmlEl.classList.contains('rounded-full')) {
          htmlEl.style.borderRadius = '9999px'
        }
        if (htmlEl.classList.contains('px-3')) {
          htmlEl.style.paddingLeft = '1rem'
          htmlEl.style.paddingRight = '1rem'
        }
        if (
          htmlEl.classList.contains('py-1.5') ||
          htmlEl.classList.contains('py-1')
        ) {
          htmlEl.style.paddingTop = '0.5rem'
          htmlEl.style.paddingBottom = '0.5rem'
        }
        if (htmlEl.classList.contains('gap-2')) {
          htmlEl.style.gap = '0.75rem'
        }
        if (htmlEl.classList.contains('w-10')) {
          htmlEl.style.width = '3rem'
        }
        if (htmlEl.classList.contains('w-8')) {
          htmlEl.style.width = '2.5rem'
        }
        if (htmlEl.classList.contains('h-7')) {
          htmlEl.style.height = '2.5rem'
        }
        if (htmlEl.classList.contains('h-6')) {
          htmlEl.style.height = '2rem'
        }
        if (htmlEl.classList.contains('border-b')) {
          htmlEl.style.borderBottomWidth = '2px'
          htmlEl.style.borderBottomStyle = 'solid'
          htmlEl.style.borderBottomColor = darkMode
            ? 'rgba(255, 255, 255, 0.1)'
            : '#e5e7eb'
        }
        if (htmlEl.classList.contains('border-t')) {
          htmlEl.style.borderTopWidth = '2px'
          htmlEl.style.borderTopStyle = 'solid'
          htmlEl.style.borderTopColor = darkMode
            ? 'rgba(255, 255, 255, 0.1)'
            : '#e5e7eb'
        }
        if (htmlEl.classList.contains('pb-6')) {
          htmlEl.style.paddingBottom = '2rem'
        }
        if (htmlEl.classList.contains('pt-6')) {
          htmlEl.style.paddingTop = '2rem'
        }
      })

      document.body.appendChild(clonedElement)

      await new Promise((resolve) => setTimeout(resolve, 300))

      const dataUrl = await toJpeg(clonedElement, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: darkMode ? '#0a0a0a' : '#fafafa',
        cacheBust: true,
        width: exportWidth,
        height: exportHeight,
        style: {
          transform: 'scale(1)',
          opacity: '1',
        },
      })

      document.body.removeChild(clonedElement)
      clonedElement = null

      setImageDataUrl(dataUrl)
      setPreviewOpen(true)
      setIdle()
    } catch (error) {
      console.error('Statistics export failed:', error)

      if (clonedElement && document.body.contains(clonedElement)) {
        document.body.removeChild(clonedElement)
      }

      setError()
    }
  }, [
    statisticsRef,
    calendarData,
    year,
    isDarkMode,
    setLoading,
    setIdle,
    setError,
  ])

  return {
    exportStatistics,
    status,
    previewOpen,
    setPreviewOpen,
    imageDataUrl,
    filename,
  }
}
