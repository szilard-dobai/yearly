import { Flag } from '@/components/Emoji'
import { getCountryName } from '@/lib/admin/format'
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
    <Flag
      code={code}
      alt={name}
      title={name}
      className={cn('cursor-default', className)}
    />
  )
}
