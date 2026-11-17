import { cn } from '@/lib/utils'
import { formatPrice, VIDEO_PACK_PRICE } from '@/lib/video-offer'

interface FreeVideoPriceProps {
  price?: number
  className?: string
  freeClassName?: string
}

export function FreeVideoPrice({
  price = VIDEO_PACK_PRICE,
  className,
  freeClassName,
}: FreeVideoPriceProps) {
  const formatted = formatPrice(price)
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1.5 whitespace-nowrap',
        className
      )}
    >
      <span className="sr-only">Free instead of {formatted}</span>
      <s aria-hidden className="font-normal opacity-60">
        {formatted}
      </s>
      <span aria-hidden className={freeClassName}>
        Free
      </span>
    </span>
  )
}
