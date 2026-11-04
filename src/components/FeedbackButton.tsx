'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { MessageSquareText } from 'lucide-react'

interface FeedbackButtonProps {
  onClick: () => void
  className?: string
}

export default function FeedbackButton({
  onClick,
  className,
}: FeedbackButtonProps) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'h-11 rounded-full px-5 shadow-lg bg-white text-gray-900 border-gray-200 hover:bg-gray-50 dark:bg-[#1a1a1a] dark:text-zinc-100 dark:border-white/8 dark:hover:bg-[#222222]',
        className
      )}
    >
      <MessageSquareText className="size-4" />
      Feedback
    </Button>
  )
}
