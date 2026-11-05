import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AnalyticsOverviewDialog, {
  type HighLevelStats,
} from './AnalyticsOverviewDialog'

const stats: HighLevelStats = {
  totalEvents: 1234,
  uniqueCountries: 12,
  uniqueDevices: 87,
  totalVisitsAdded: 4321,
  visitAttempts: { total: 300, successful: 290, failed: 10 },
  deviceTypePercentages: { mobile: 70, tablet: 5, desktop: 25 },
  deviceTypeCounts: { mobile: 61, tablet: 4, desktop: 22 },
  exports: {
    imageExportClicks: 40,
    statisticsExportClicks: 15,
    imageDownloadClicks: 30,
  },
  dataManagement: { jsonImports: 1, jsonExports: 2, calendarResets: 3 },
  pageViews: { homepage: 500, createPage: 400, notFound: 2 },
  eventBreakdown: {
    homepage_view: 500,
    visit_add_attempt: 300,
    legacy_share_click: 4,
  },
  topCountriesByDevices: [
    { country: 'DE', deviceCount: 30 },
    { country: 'FR', deviceCount: 1 },
  ],
  interestingMentions: [],
}

describe('AnalyticsOverviewDialog', () => {
  it('lists event types by readable label, most frequent first', () => {
    render(
      <AnalyticsOverviewDialog
        open
        onOpenChange={vi.fn()}
        stats={stats}
        isLoading={false}
      />
    )

    const panel = screen.getByRole('heading', { name: 'Events by type' })
      .parentElement as HTMLElement
    const labels = within(panel)
      .getAllByTitle(/_/)
      .map((row) => row.textContent)

    expect(labels).toEqual([
      `Homepage viewed${(500).toLocaleString()}`,
      `Visit add attempted${(300).toLocaleString()}`,
      'Legacy share click4',
    ])
  })

  it('shows countries with their flag and name', () => {
    render(
      <AnalyticsOverviewDialog
        open
        onOpenChange={vi.fn()}
        stats={stats}
        isLoading={false}
      />
    )

    expect(screen.getByText('Germany')).toBeInTheDocument()
    expect(screen.getByText('🇩🇪')).toBeInTheDocument()
    expect(screen.getByText('device')).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'Interesting mentions' })
    ).not.toBeInTheDocument()
  })
})
