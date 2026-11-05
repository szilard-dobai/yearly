import { getCountryName } from '@/lib/admin/format'
import { getFlagEmoji } from '@/lib/countries'
import { cn } from '@/lib/utils'

export default function CountryFlag({
  code,
  className,
}: {
  code: string
  className?: string
}) {
  const name = getCountryName(code)
  return (
    <span
      role="img"
      aria-label={name}
      title={name}
      className={cn('shrink-0 cursor-default', className)}
    >
      {getFlagEmoji(code)}
    </span>
  )
}
