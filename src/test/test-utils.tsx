import { ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { SettingsProvider } from '@/lib/contexts/SettingsContext'

function TestWrapper({ children }: { children: ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>
}

function renderWithSettings(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: TestWrapper, ...options })
}

export { renderWithSettings, TestWrapper }
export * from '@testing-library/react'
