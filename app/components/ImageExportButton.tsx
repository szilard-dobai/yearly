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

    let clonedElement: HTMLDivElement | null = null

    try {
      const element = calendarRef.current

      // Clone the element for export
      clonedElement = element.cloneNode(true) as HTMLDivElement

      // Style the clone for export
      clonedElement.style.position = 'absolute'
      clonedElement.style.left = '0'
      clonedElement.style.top = '0'
      clonedElement.style.width = '1200px'
      clonedElement.style.maxWidth = '1200px'
      clonedElement.style.transform = 'none'
      clonedElement.style.zIndex = '-1000'
      clonedElement.style.pointerEvents = 'none'
      clonedElement.style.opacity = '0'

      // Force desktop grid layout (3 columns) for export
      // Find the grid container and override its classes
      const gridContainer = clonedElement.querySelector(
        '.grid-cols-1'
      ) as HTMLElement
      if (gridContainer) {
        // Override grid to always show 3 columns for desktop export
        gridContainer.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))'
      }

      // Override any responsive spacing/sizing
      const allElements = clonedElement.querySelectorAll('*')
      allElements.forEach((el) => {
        const htmlEl = el as HTMLElement
        // Force larger spacing and text sizes
        if (htmlEl.classList.contains('text-4xl')) {
          htmlEl.style.fontSize = '4.5rem' // Even larger year text
        }
        if (
          htmlEl.classList.contains('space-y-1') ||
          htmlEl.classList.contains('space-y-2')
        ) {
          htmlEl.style.rowGap = '0.5rem' // sm:space-y-2 equivalent
        }
        // Make month names larger (distinguish from flags by checking parent class)
        if (
          htmlEl.classList.contains('text-base') &&
          htmlEl.classList.contains('font-bold')
        ) {
          htmlEl.style.fontSize = '1.5rem' // Larger month names (text-2xl equivalent)
        }
        // Make day numbers larger
        if (htmlEl.classList.contains('text-[10px]')) {
          htmlEl.style.fontSize = '1rem' // Make day numbers much larger (text-base)
        }
        // Make diagonal split flag emojis larger (have fixed-size containers)
        if (
          (htmlEl.classList.contains('text-lg') || htmlEl.classList.contains('text-xl')) &&
          htmlEl.classList.contains('leading-none') &&
          (htmlEl.classList.contains('w-6') || htmlEl.classList.contains('w-8'))
        ) {
          htmlEl.style.fontSize = '1.5rem' // Larger diagonal split flags (text-2xl equivalent)
        }
        // Make single flag emojis larger (no fixed-size container, just text-lg)
        else if (
          htmlEl.classList.contains('text-lg') &&
          !htmlEl.classList.contains('w-6') &&
          !htmlEl.classList.contains('w-8')
        ) {
          htmlEl.style.fontSize = '2rem' // Larger flag emojis (text-3xl equivalent)
        }
        // Make flag icons larger
        if (htmlEl.classList.contains('w-6')) {
          htmlEl.style.width = '2.5rem' // Larger flag icon width
        }
        if (htmlEl.classList.contains('h-4')) {
          htmlEl.style.height = '1.75rem' // Larger flag icon height
        }
      })

      // Append to body
      document.body.appendChild(clonedElement)

      // Add a small delay to ensure styles are applied and layout is calculated
      await new Promise((resolve) => setTimeout(resolve, 300))

      const dataUrl = await toJpeg(clonedElement, {
        quality: 0.95,
        pixelRatio: 2, // High DPI for quality
        backgroundColor: '#ffffff', // Force white background
        cacheBust: true,
        width: 1200,
        style: {
          // Ensure good rendering
          transform: 'scale(1)',
          opacity: '1',
        },
      })

      // Remove the clone
      document.body.removeChild(clonedElement)
      clonedElement = null

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

      // Clean up clone if it exists
      if (clonedElement && document.body.contains(clonedElement)) {
        document.body.removeChild(clonedElement)
      }

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
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image className="size-4" />
          Export as Image
        </>
      )}
    </Button>
  )
}
