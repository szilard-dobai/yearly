import { useState, RefObject } from 'react'
import { toJpeg } from 'html-to-image'

interface ImageExportButtonProps {
  calendarRef: RefObject<HTMLDivElement | null>
  year: number
  hasData: boolean
}

export default function ImageExportButton({
  calendarRef,
  year,
  hasData,
}: ImageExportButtonProps) {
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')

  const handleExport = async () => {
    if (!calendarRef.current) {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
      return
    }

    setStatus('loading')

    try {
      // Add a small delay to ensure styles are applied
      await new Promise((resolve) => setTimeout(resolve, 100))

      const dataUrl = await toJpeg(calendarRef.current, {
        quality: 0.95,
        pixelRatio: 2, // High DPI for quality
        backgroundColor: '#ffffff', // Force white background
        cacheBust: true,
        style: {
          // Ensure good rendering
          transform: 'scale(1)',
        },
      })

      // Create download link
      const link = document.createElement('a')
      link.download = `countries-in-year-${year}.jpg`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      setStatus('success')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (error) {
      console.error('Image export failed:', error)
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const buttonText =
    status === 'loading'
      ? 'Generating...'
      : status === 'success'
        ? 'Downloaded!'
        : status === 'error'
          ? 'Export failed'
          : 'Export as Image'

  const isDisabled = !hasData || status === 'loading'

  const getButtonClassName = () => {
    if (!hasData && status !== 'loading') {
      return 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
    }
    if (status === 'loading') {
      return 'bg-blue-500 text-white cursor-wait'
    }
    if (status === 'success') {
      return 'bg-green-600 text-white'
    }
    if (status === 'error') {
      return 'bg-red-600 text-white'
    }
    return 'bg-purple-600 hover:bg-purple-700 text-white'
  }

  return (
    <button
      onClick={handleExport}
      disabled={isDisabled}
      className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${getButtonClassName()}`}
      aria-label={
        hasData ? 'Export calendar as JPEG image' : 'No data to export'
      }
    >
      {status === 'loading' && (
        <span className="inline-block mr-2 animate-spin">⏳</span>
      )}
      {buttonText}
    </button>
  )
}
