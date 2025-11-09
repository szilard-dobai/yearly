# Countries in Year - Initial Plan

## Project Overview

A Next.js web application that generates a visual calendar showing which countries you've visited throughout a year. Each date you visited a country will display that country's flag emoji instead of the date number.

## Core Features

### 1. Data Input
- Allow users to add country visits with:
  - Country selection (with autocomplete/dropdown)
  - Date range picker (user selects start and end date)
  - Support up to 2 countries per day maximum
- Simple form-based interface
- Client-side state management (no database needed)
- Local storage for automatic persistence
- Developer mode toggle to view/copy raw JSON data

### 2. Calendar Generation
- Display full year calendar (12 months) with iOS calendar-inspired minimal design
- Replace date numbers with country flag emojis (one emoji per date cell)
- Handle two countries per day: display vertically stacked like ½ symbol (first country on top, second on bottom)
- Responsive grid layout for months
- Visual states:
  - Empty dates: show date number
  - Single country: show flag emoji centered
  - Two countries: show flags stacked vertically (top/bottom)

### 3. Image Export
- Generate high-quality JPEG image of the calendar
- Use html-to-image library with JPEG format
- Downloadable via "Export" button
- Include year indicator in the exported image
- Calendar preview shown before/during export

### 4. User Experience
- Clean, minimal iOS calendar-inspired interface
- Mobile-responsive design
- Year selector (default to current year)
- Clear visual hierarchy
- Developer mode toggle (hidden by default):
  - View raw JSON data
  - "Copy to clipboard" button for JSON export
- Live preview of calendar as user adds visits

## Technical Architecture

### Tech Stack (Already Defined)
- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **React**: 19.2.0

### Proposed File Structure
```
/app
  /page.tsx                 - Main landing/calendar view
  /layout.tsx              - Root layout (existing)
  /components
    /CalendarGrid.tsx      - Year calendar display component
    /CountryInput.tsx      - Form for adding country visits (with date range)
    /DateCell.tsx          - Individual date cell with flag(s) or number
    /ExportButton.tsx      - JPEG image export functionality
    /DeveloperMode.tsx     - JSON viewer with copy-to-clipboard
  /lib
    /countries.ts          - Country data (names, flag emojis, ISO codes)
    /calendar.ts           - Calendar logic (date utilities)
    /types.ts              - TypeScript interfaces
    /storage.ts            - Local storage helpers
/docs
  /01-initial-plan.md      - This file

### Data Models

```typescript
interface CountryVisit {
  id: string;
  countryCode: string;  // ISO 3166-1 alpha-2 code
  countryName: string;
  flagEmoji: string;
  date: Date;           // Single date
}

interface CalendarData {
  year: number;
  visits: CountryVisit[];
}
```

### Key Libraries to Consider
- **dayjs**: Lightweight date manipulation and range utilities (2KB alternative to date-fns)
- **html-to-image**: JPEG export from DOM (supports JPEG quality settings)
- **country-flag-emoji** or built-in emoji support: Flag emoji mapping
- Native HTML5 datepicker or **react-datepicker**: Date range selection

## Implementation Phases

### Phase 1: Foundation (Setup & Data Structure)
- Set up project structure
- Define TypeScript interfaces
- Create country data source (with flag emojis)
- Build basic UI layout

### Phase 2: Calendar Display
- Create calendar grid component (iOS-inspired minimal design)
- Implement month/year logic
- Build date cell component with three states:
  - Empty (show date number)
  - Single flag (centered emoji)
  - Two flags (stacked vertically like ½)
- Add flag emoji rendering with proper sizing

### Phase 3: Data Input
- Build country input form with date range picker
- Implement validation (max 2 countries per day)
- Add/edit/delete visit functionality
- Client-side state management (useState or useReducer)
- Auto-save to local storage

### Phase 4: Image Export
- Implement JPEG image generation using html-to-image
- Add export button with download functionality
- Optimize calendar styling for high-quality JPEG export

### Phase 5: Polish & Enhancement
- Responsive design refinement
- Developer mode with JSON viewer and copy-to-clipboard
- Error handling and validation
- Edge case handling (leap years, date boundaries)
- Testing and bug fixes
- Performance optimization

## Design Considerations

### Calendar Layout
- **iOS-inspired minimal design**: Clean, spacious, easy to read
- **Grid Layout**: 3x4 or 4x3 grid (optimize for screen size)
- Subtle borders and spacing
- Light/dark mode support (already in stack)
- Highlight current day subtly (if viewing current year)

### Flag Display (Finalized)
- **Empty date**: Show date number in light gray
- **Single country**: Show flag emoji centered in cell
- **Two countries**: Stack vertically like ½ symbol:
  - Top half: First country flag (smaller size)
  - Bottom half: Second country flag (smaller size)
  - Use flexbox or grid for vertical stacking

### Color Scheme
- Minimal, clean palette similar to iOS Calendar
- Soft grays for borders and empty dates
- White/dark backgrounds depending on theme
- No bright colors to keep focus on flag emojis

## Design Decisions (Finalized)

1. **Multi-day visits**: ✓ Date range picker - user selects start/end, system populates each day
2. **Multiple countries per day**: ✓ Max 2 countries, displayed vertically stacked (½ style)
3. **Export format**: ✓ JPEG (high quality, widely supported)
4. **Data persistence**: ✓ Local storage with developer mode for JSON view/copy
5. **Year range**: Single year (one calendar per year) - can revisit later
6. **Country list**: Comprehensive list of all countries with ISO codes and flag emojis
7. **Calendar style**: ✓ Minimal iOS-inspired design, no statistics in MVP

## Success Criteria

- [ ] User can add country visits with date ranges
- [ ] System handles date range expansion (one entry per day)
- [ ] Validation: Maximum 2 countries per day
- [ ] Calendar displays full year with iOS-inspired minimal design
- [ ] Date cells show: numbers (empty), single flag (centered), or two flags (stacked)
- [ ] User can export calendar as high-quality JPEG
- [ ] Local storage auto-saves data
- [ ] Developer mode shows JSON with copy-to-clipboard
- [ ] Responsive design works on mobile and desktop
- [ ] No bugs or broken functionality
- [ ] Clean, maintainable TypeScript code

## Next Steps

1. ✓ Finalize design decisions
2. Install required dependencies (dayjs, html-to-image)
3. Set up project structure (components, lib directories)
4. Begin Phase 1: Foundation and data structures
5. Implement Phase 2-5 sequentially with testing
