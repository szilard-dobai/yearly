import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsProvider, useSettings } from './SettingsContext'

const STORAGE_KEY = 'countries-in-year-settings'

function ShowSettings() {
  const { settings, isLoaded } = useSettings()
  return isLoaded ? <pre>{JSON.stringify(settings)}</pre> : null
}

function renderSettings() {
  render(
    <SettingsProvider>
      <ShowSettings />
    </SettingsProvider>
  )
}

describe('SettingsProvider', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('loads settings saved before the flag style setting was removed', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        flagDisplayMode: 'icon',
        weekStartsOn: 0,
        colorScheme: 'dark',
        highlightToday: false,
        exportFormat: 'feed',
      })
    )

    renderSettings()

    const settings = JSON.parse(
      (await screen.findByText(/weekStartsOn/)).textContent ?? ''
    )
    expect(settings).toEqual({
      weekStartsOn: 0,
      colorScheme: 'dark',
      highlightToday: false,
      exportFormat: 'feed',
    })
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual(
        settings
      )
    )
  })
})
