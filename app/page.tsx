'use client'

import CalendarGrid from './components/CalendarGrid'
import CountryInput from './components/CountryInput'
import ExportButton from './components/ExportButton'
import DeveloperMode from './components/DeveloperMode'

export default function Home() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Countries in Year
            </h1>
            <select
              className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
              defaultValue={new Date().getFullYear()}
            >
              <option value={new Date().getFullYear()}>
                {new Date().getFullYear()}
              </option>
              <option value={new Date().getFullYear() - 1}>
                {new Date().getFullYear() - 1}
              </option>
              <option value={new Date().getFullYear() + 1}>
                {new Date().getFullYear() + 1}
              </option>
            </select>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
          <div className="space-y-6">
            <CalendarGrid />
          </div>

          <aside className="space-y-6">
            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
              <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Add Visit
              </h2>
              <CountryInput />
            </div>

            <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-4">
              <ExportButton />
            </div>
          </aside>
        </div>
      </main>

      <footer className="container mx-auto px-4 py-8">
        <details className="rounded-lg border border-gray-200 dark:border-gray-800">
          <summary className="px-4 py-3 cursor-pointer font-medium text-sm text-gray-700 dark:text-gray-300">
            Developer Mode
          </summary>
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800">
            <DeveloperMode />
          </div>
        </details>
      </footer>
    </div>
  )
}
