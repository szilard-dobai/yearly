import { ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { SettingsProvider } from '@/lib/contexts/SettingsContext'

function TestWrapper({ children }: { children: ReactNode }) {
  return <SettingsProvider>{children}</SettingsProvider>
}

function renderWithSettings(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: TestWrapper, ...options })
}

function textAcrossElements(text: string | RegExp) {
  const matches = (element: Element) => {
    const content = (element.textContent ?? '').replace(/\s+/g, ' ').trim()
    return typeof text === 'string' ? content === text : text.test(content)
  }

  return (_content: string, element: Element | null) =>
    element !== null &&
    matches(element) &&
    Array.from(element.children).every((child) => !matches(child))
}

export { renderWithSettings, textAcrossElements, TestWrapper }
export * from '@testing-library/react'
