# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js 16 application using the App Router architecture, React 19, TypeScript, and Tailwind CSS v4. The app lets users track their travel dates by country and generate shareable calendar images with country flags.

## Development Commands

- **Development server**: `npm run dev` - Starts the Next.js development server at http://localhost:3000
- **Build**: `npm run build` - Creates production build
- **Production server**: `npm run start` - Runs production server
- **Lint**: `npm run lint` - Runs ESLint with Next.js configuration
- **Format**: `npm run format` - Runs Prettier
- **Type check**: `npm run type-check` - Runs TypeScript type checking
- **Test**: `npm run test` - Runs Vitest tests
- **Full check**: `npm run check:full` - Runs lint + type-check + tests + build

## Tech Stack

- **Framework**: Next.js 16.0.1 with App Router
- **React**: 19.2
- **TypeScript**: v5 with strict mode enabled
- **Styling**: Tailwind CSS v4 with PostCSS
- **UI**: Radix UI primitives + shadcn/ui components
- **Animations**: Motion (Framer Motion)
- **Image export**: html-to-image (toJpeg)
- **Validation**: Zod
- **Database**: MongoDB (analytics only)
- **Testing**: Vitest + Testing Library

## Project Structure

```
src/
├── app/
│   ├── page.tsx              - Homepage / landing page
│   ├── layout.tsx            - Root layout with font configuration
│   ├── globals.css           - Global styles, CSS variables, Tailwind config
│   ├── create/page.tsx       - Main app page (calendar, exports, settings)
│   ├── admin/analytics/      - Admin analytics dashboard
│   └── api/                  - API routes (tracking, auth)
├── components/
│   ├── CalendarGrid.tsx      - 12-month calendar display
│   ├── MonthlyExportLayout.tsx - Monthly export layout (1080×1920)
│   ├── StatisticsExportLayout.tsx - Statistics export layout (1200×1739)
│   ├── ImagePreviewModal.tsx - Export preview and download modal
│   ├── Flag.tsx              - Country flag component (emoji/icon modes)
│   ├── CountryInput.tsx      - Country and date picker
│   ├── Statistics.tsx        - Travel statistics display
│   ├── MobileFab.tsx         - Mobile floating action button
│   └── ui/                   - Reusable UI primitives (shadcn/ui)
├── lib/
│   ├── types.ts              - Core types (Country, CountryVisit, CalendarData)
│   ├── constants.ts          - Month names, flag sizes
│   ├── calendar.ts           - Calendar grid calculations
│   ├── statistics.ts         - 30+ statistics calculation functions
│   ├── countries.ts          - Country data and lookup
│   ├── storage.ts            - LocalStorage persistence with Zod validation
│   ├── hooks/
│   │   ├── useImageExport.ts       - Full-year calendar export
│   │   ├── useMonthlyExport.ts     - Monthly calendar export
│   │   ├── useStatisticsExport.ts  - Statistics image export
│   │   └── useStatusFeedback.ts    - Loading/error state management
│   ├── contexts/
│   │   └── SettingsContext.tsx      - User preferences (theme, flags, week start)
│   └── tracking/             - Event tracking and analytics
└── test/                     - Test setup and utilities
```

## Key Architecture Patterns

### Image Export
All three export types (calendar, monthly, statistics) follow the same pattern:
1. Clone the source DOM element
2. Apply inline styles to scale up for export (the hooks map Tailwind classes to explicit sizes)
3. Show the hidden watermark
4. Render to JPEG via `html-to-image` with `skipFonts: true` (avoids CORS errors with Google Fonts)
5. Present in ImagePreviewModal for download/share

### Dark Mode
Uses Material Design elevation hierarchy:
- `#0a0a0a` (page background) → `#141414` (cards) → `#1a1a1a` (elevated surfaces) → `#222222` (hover)
- Zinc color scale for text: zinc-100 (headings), zinc-400 (secondary), zinc-500 (muted)
- Borders: `white/8` throughout
- Calendar and exports use pure black (`#000000`) background in dark mode

### Data Flow
- Calendar data stored in LocalStorage with Zod schema validation
- Settings managed via React Context (SettingsContext)
- Undo stack (10 levels) for visit removal
- Import/export as JSON

## Styling Approach

- Uses Tailwind CSS v4 with the new `@import "tailwindcss"` syntax
- CSS variables for theming (`--background`, `--foreground`)
- Dark mode via class strategy: `@custom-variant dark (&:is(.dark *))`
- Tailwind theme customization using `@theme inline` directive
- Font variables: `--font-geist-sans`, `--font-geist-mono`, `--font-newsreader`
- Do not place any comments unless absolutely necessary to clarify what is going on
- Use canonical Tailwind v4 syntax (e.g., `h-10!` not `!h-10`, `white/8` not `white/[0.08]`)

## Code Conventions

- **Components**: Use TypeScript with .tsx extension
- **Styling**: Utility-first with Tailwind CSS classes
- **Layout patterns**: App Router uses nested layouts
- **Metadata**: Export `metadata` object from layout.tsx for SEO
- **Fonts**: Loaded and configured in root layout as CSS variables
- **Card variants**: Use StandardCard, DarkCard, GradientCard from `ui/card-variants.tsx`
