import type { PropsWithChildren } from 'react'
import { YearlyLogo } from './YearlyLogo'

function Header({ children }: PropsWithChildren) {
  return (
    <header className="border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-black/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-3 py-4 flex justify-between items-center">
        <YearlyLogo />

        {children}
      </div>
    </header>
  )
}

export default Header
