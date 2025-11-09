import { useState, RefObject } from 'react'
import { toJpeg } from 'html-to-image'
import { Button } from '@/app/components/ui/button'
import { Image, CheckCircle2, XCircle, Loader2 } from 'lucide-react'

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

  const isDisabled = !hasData || status === 'loading'

  return (
    <Button
      onClick={handleExport}
      disabled={isDisabled}
      className="w-full"
      variant={
        status === 'success'
          ? 'default'
          : status === 'error'
            ? 'destructive'
            : 'secondary'
      }
      aria-label={
        hasData ? 'Export calendar as JPEG image' : 'No data to export'
      }
    >
      {status === 'loading' ? (
        <>
          <Loader2 className="size-4 animate-spin" />
          Generating...
        </>
      ) : status === 'success' ? (
        <>
          <CheckCircle2 className="size-4" />
          Downloaded!
        </>
      ) : status === 'error' ? (
        <>
          <XCircle className="size-4" />
          Export failed
        </>
      ) : (
        <>
          <Image className="size-4" />
          Export as Image
        </>
      )}
    </Button>
  )
}
