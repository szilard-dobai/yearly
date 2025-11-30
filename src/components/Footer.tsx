import ThemeToggle from './ThemeToggle'

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-white/10 bg-white dark:bg-black mx-auto px-3 py-8 space-y-4">
      <div className="container mx-auto flex justify-between items-center">
        <p className="m-0 text-sm font-mono text-muted-foreground">
          Built by{' '}
          <a
            href="https://www.linkedin.com/in/szilard-dobai/"
            target="blank"
            className="hover:opacity-80 transition-opacity underline"
          >
            Szilard Dobai
          </a>
        </p>

        <ThemeToggle />
      </div>
    </footer>
  )
}
