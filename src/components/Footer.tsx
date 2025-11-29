import ThemeToggle from './ThemeToggle'

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Yearly - Track your travels
        </p>
        <ThemeToggle />
      </div>
    </footer>
  )
}
