'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, X } from 'lucide-react'

interface ImagePreviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageDataUrl: string | null
  filename: string
}

export default function ImagePreviewModal({
  open,
  onOpenChange,
  imageDataUrl,
  filename,
}: ImagePreviewModalProps) {
  const handleDownload = () => {
    if (!imageDataUrl) return

    const link = document.createElement('a')
    link.download = filename
    link.href = imageDataUrl
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl w-[calc(100%-2rem)] max-h-[90vh] flex flex-col"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>My Year</DialogTitle>
          <DialogDescription>
            Preview your calendar image before downloading
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto rounded-md border bg-muted/30">
          {imageDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageDataUrl}
              alt="Calendar preview"
              className="w-full h-auto rounded"
            />
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="size-4" />
            Cancel
          </Button>
          <Button
            onClick={handleDownload}
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Download className="size-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
