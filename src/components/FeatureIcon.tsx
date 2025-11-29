import { cn } from '@/lib/utils'

interface FeatureIconProps {
  icon: React.ReactNode
  className?: string
}

export function FeatureIcon({ icon, className }: FeatureIconProps) {
  return (
    <div
      className={cn(
        'w-14 h-14 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6',
        className
      )}
    >
      {icon}
    </div>
  )
}
