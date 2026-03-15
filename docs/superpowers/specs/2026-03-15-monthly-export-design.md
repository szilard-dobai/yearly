# Monthly Export Feature Design

## Problem

The app currently only supports exporting a full-year calendar and yearly statistics. This limits the app's usefulness to a few months a year (year-in-review season). Users want to share monthly travel summaries throughout the year on social media.

## Solution

Add a monthly export that generates a single vertical image combining a one-month calendar grid with month-scoped statistics. The feature integrates into the existing UI with minimal changes.

## Exported Image Design

### Layout (top to bottom)

1. **Month + Year header** — left-aligned, red, bold (e.g., "March 2026"). Matches the existing yearly export style.
2. **Calendar grid** — 7-column grid for the selected month. Respects `weekStartsOn` setting. Flags in cells for visited days, day numbers for unvisited days. Same rendering as existing `MonthGrid`/`DateCell` but scaled up for export.
3. **Stats grid** — 2x2 grid of stat cards:
   - Countries Visited (unique countries in that month)
   - Days Abroad (unique days with visits in that month)
   - Average Trip Length (scoped to month)
   - Month Abroad % (days abroad / days in month × 100)
4. **Top Countries ranking** — up to 5 countries ranked by days, with medal emojis for top 3. Same style as existing `StatisticsExportLayout`.
5. **Watermark** — "made with yearly.world", centered at bottom.

### Dimensions & Format

- **Target**: 1080x1920px (9:16 Instagram story ratio)
- **Format**: JPEG, 0.95 quality, 2x pixel ratio (matching existing exports)
- **Theme**: Dark/light mode support, same background colors as existing exports (`#0a0a0a` dark / `#fafafa` light)

### Stats Scoping

Reuse existing statistics functions from `src/lib/statistics.ts`, but filter visits to the selected month before calculating. Changes from yearly stats:
- Remove "Busiest Month" (irrelevant for single month)
- Replace "Year Abroad %" with "Month Abroad %" (days abroad / days in month)

## UI Changes

### Sidebar Export Card

Current state: "Export Your Year" card with "Download Calendar" and "Download Statistics" buttons.

Changes:
- Rename card title from "Export Your Year" to "Export"
- Keep existing two buttons unchanged
- Add a horizontal divider below existing buttons
- Below divider: month dropdown (Select component, defaults to current month) + "Download Month" button
- The card still only appears when the selected year has visits

### Month Header Shortcut (Desktop)

- On hover over a month name in `CalendarGrid`, show a small download icon (e.g., `Download` from lucide-react)
- Clicking the icon triggers the monthly export for that specific month, bypassing the sidebar month picker
- Icon is subtle (gray, small) to avoid cluttering the calendar
- Desktop only — no hover state on mobile/touch

### Mobile

- Add monthly export to the `MobileFab` component via new `onExportMonthClick` prop
- Tapping it opens a dialog (owned by `create/page.tsx`, same pattern as mobile "Add Visit" dialog) with a month picker and "Download Month" button

## New Components

### `MonthlyExportLayout`

- Path: `src/components/MonthlyExportLayout.tsx`
- Similar to `StatisticsExportLayout` — a `forwardRef` component rendered hidden in the DOM, used as the source for `html-to-image` export
- Props: `calendarData`, `year`, `month`
- Reads `weekStartsOn` and `flagDisplayMode` from `useSettings()` internally (same pattern as `StatisticsExportLayout`)
- Renders: month+year header, single-month calendar grid, 2x2 stats, top countries, watermark
- The calendar grid inside this component is a self-contained render (not reusing `MonthGrid` directly) to avoid interactive elements (remove buttons, hover states) leaking into the export

### `useMonthlyExport`

- Path: `src/lib/hooks/useMonthlyExport.ts`
- Similar to `useStatisticsExport` — clones the `MonthlyExportLayout` ref, applies export styles, calls `toJpeg`
- Props: `monthlyExportRef`, `calendarData`, `year`, `month`
- Returns: `exportMonth()`, `status`, `previewOpen`, `setPreviewOpen`, `imageDataUrl`, `filename`
- Filename format: `my-month-{month-name}-{year}.jpg` (e.g., `my-month-march-2026.jpg`)
- Export dimensions: 1080x1920 (or scaled equivalent at 2x pixel ratio)

### Monthly Statistics Helpers

- Path: add to existing `src/lib/statistics.ts`
- `calculatePercentageOfMonthTraveled(visits, year, month)` — days abroad / days in month × 100
- All other stats (countries visited, days traveled, avg trip, countries by days) already work when given a filtered visit array — no new functions needed, just filter visits to the month before calling

## Changes to Existing Components

### `CalendarGrid.tsx`

- Add `onMonthExport?: (month: number) => void` prop
- Pass it to `MonthGrid`

### `MonthGrid.tsx`

- Add `onExport?: () => void` prop
- On hover over the month name `<h3>`, show a download icon button
- Clicking the icon calls `onExport()`

### `MobileFab.tsx`

- Add `onExportMonthClick` prop
- Add a new FAB button for monthly export

### `create/page.tsx`

- Add `monthlyExportRef`, `selectedMonth` state (defaults to current month)
- Wire up `useMonthlyExport` hook
- Render `MonthlyExportLayout` (hidden) in the DOM
- Add month picker + export button to the sidebar export card
- Add `ImagePreviewModal` for monthly export
- Handle `onMonthExport` from `CalendarGrid` to set month and trigger export
- Wire mobile FAB

## Tracking

New events:
- `monthly_export_click` — when user clicks "Download Month" button or month header icon. Metadata: `{ year, month, source: 'sidebar' | 'header' | 'mobile_fab' }`

The download action from the preview modal is handled by the existing `ImagePreviewModal` which already fires `image_download_click`. No new download event needed — the modal is reused as-is.

Add `monthly_export_click` to the existing `TrackingEventType` union in tracking code.

## What This Does NOT Change

- The full-year calendar view remains the primary UI — no new pages or views
- Existing yearly calendar and statistics exports are untouched
- No changes to data model (`CountryVisit`, `CalendarData`)
- No changes to localStorage schema
- No changes to the homepage or admin analytics pages
- No backend changes needed (export is fully client-side)
