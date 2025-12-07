import LogoSvg from '@/assets/logo.svg'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export function YearlyLogo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('flex items-center gap-3', className)}>
      <div className="relative w-10 h-10">
        <LogoSvg className="w-full h-full" />
      </div>

      <span className="text-3xl leading-none pt-2 font-serif font-normal tracking-tight">
        Yearly
      </span>
    </Link>
  )
}
