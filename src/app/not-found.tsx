import { Home } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center px-6">
      <div className="text-center">
        <p className="text-xl text-gray-500 dark:text-gray-400 mb-2">
          Page not found
        </p>
        <p className="text-gray-400 dark:text-gray-500 mb-10 max-w-md mx-auto">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-full hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
        
        >
          <Home className="w-4 h-4" />
          Home
        </Link>
      </div>
    </main>
  )
}
