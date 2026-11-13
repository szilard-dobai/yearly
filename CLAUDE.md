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
- **Database migration**: `npm run db:generate -- --name <name>` writes a SQL migration in `drizzle/` from `src/lib/db/schema.ts`; `npm run db:migrate` applies it. Vercel runs `vercel-build`, which migrates before building, so every migration must work with the code already deployed (add first, remove later)
- **Install**: `.npmrc` sets `legacy-peer-deps=true`, because Better Auth's optional framework peers (SvelteKit, TanStack Start) want Vite 8 and the tests use Vite 7

## Tech Stack

- **Framework**: Next.js 16.0.1 with App Router
- **React**: 19.2
- **TypeScript**: v5 with strict mode enabled
- **Styling**: Tailwind CSS v4 with PostCSS
- **UI**: Radix UI primitives + shadcn/ui components
- **Animations**: Motion (Framer Motion)
- **Image export**: html-to-image (toJpeg)
- **Validation**: Zod
- **Database**: Postgres on Neon through Drizzle for accounts and new data; MongoDB for tracking events, feedback, waitlist and reminders until they move (see `docs/04-database-and-accounts.md`)
- **Auth**: Better Auth (version pinned exactly), optional accounts with a 6-digit email code or Google (hidden in in-app browsers); no passwords. Everything is behind `ACCOUNTS_ENABLED=true`, otherwise `/sign-in`, `/account` and `/api/auth` return 404. Pages, access rules and flows are in `docs/04-database-and-accounts.md`
- **Email**: Resend (`RESEND_API_KEY`, `EMAIL_FROM`); without a key in development, emails are logged to the console
- **Testing**: Vitest + Testing Library; database tests use PGlite with the real migrations (`src/test/db.ts`) and need `// @vitest-environment node`

## Project Structure

```
src/
├── app/
│   ├── page.tsx              - Homepage / landing page
│   ├── layout.tsx            - Root layout with font configuration
│   ├── globals.css           - Global styles, CSS variables, Tailwind config
│   ├── create/page.tsx       - Main app page (calendar, exports, settings)
│   ├── admin/analytics/      - Admin analytics dashboard
│   ├── admin/feedback/       - Admin feedback review (device activity drill-down)
│   ├── sign-in/page.tsx      - Email code or Google; `?next=` returns you afterwards; signed-in visitors are sent on (noindex)
│   ├── account/page.tsx      - Signed-in account page; signed-out visitors go to `/sign-in?next=/account` (noindex)
│   └── api/                  - API routes (tracking, feedback, Better Auth at api/auth/[...all], the signed-in calendar at api/calendar, admin auth/devices; admin-only DELETE on events, feedback and whole devices)
├── components/
│   ├── CalendarGrid.tsx      - 12-month calendar display
│   ├── YearExportLayout.tsx  - Full-year export layout (Story 1080×1920 or Feed 1080×1440)
│   ├── MonthlyExportLayout.tsx - Monthly export layout (Story 1080×1920 or Feed 1080×1440)
│   ├── StatisticsExportLayout.tsx - Statistics export layout (Story 1080×1920 or Feed 1080×1440)
│   ├── export/               - Shared export frame (padding, title, watermark), flags, stat tiles and ranking rows
│   ├── ImagePreviewModal.tsx - Export preview, Story/Feed format picker and download modal
│   ├── ExportWatermark.tsx   - "made with yearly.world" signature drawn by the export frame
│   ├── video/                - Remotion compositions for the animated video preview (year, month, stats)
│   ├── HomepageExamples.tsx  - Homepage section with real example exports
│   ├── HomepageExampleImage.tsx - Shows the light or dark example once the colour scheme is known, so only one image loads
│   ├── Flag.tsx              - Country flag component (emoji/icon modes)
│   ├── CountryInput.tsx      - Country and date picker
│   ├── Statistics.tsx        - Travel statistics display
│   ├── MobileFab.tsx         - Mobile floating action button
│   ├── FeedbackDialog.tsx    - Feedback form (star rating + message)
│   ├── FeedbackPrompt.tsx    - Inline post-download rating prompt
│   ├── FeedbackCard.tsx      - Rating card on the create page, hidden once the user rates or dismisses
│   ├── account/              - Two-step sign-in form (email, then code; or Google) and signed-in details
│   ├── admin/                - Admin-only components (login, nav, dialogs, delete confirmation, shared event badges and tiles)
│   └── ui/                   - Reusable UI primitives (shadcn/ui)
├── lib/
│   ├── types.ts              - Core types (Country, CountryVisit, CalendarData)
│   ├── constants.ts          - Month names, flag sizes
│   ├── calendar.ts           - Calendar grid calculations
│   ├── export-canvas.ts      - Export formats, canvas sizes, shared frame and layout maths
│   ├── export-render.tsx     - Mounts an export layout off-screen and renders it to JPEG
│   ├── statistics.ts         - 30+ statistics calculation functions
│   ├── countries.ts          - Country data and lookup
│   ├── storage.ts            - LocalStorage persistence with Zod validation
│   ├── hooks/
│   │   ├── useExportImage.ts       - Shared export state: format, preview, re-render on format change
│   │   ├── useImageExport.ts       - Full-year calendar export
│   │   ├── useMonthlyExport.ts     - Monthly calendar export
│   │   ├── useStatisticsExport.ts  - Statistics image export
│   │   └── useStatusFeedback.ts    - Loading/error state management
│   ├── contexts/
│   │   └── SettingsContext.tsx      - User preferences (theme, flags, week start, export format)
│   ├── db/                   - Drizzle client (`DATABASE_URL`) and schema; `auth-schema.ts` is generated by `npx auth@<better-auth version> generate`
│   ├── calendar-sync/        - Syncs the local calendar with the signed-in account: day-map format, three-way merge, versioned saves to `/api/calendar`, `useCalendarSync` for /create
│   ├── auth/                 - Better Auth config (`BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, `ACCOUNTS_ENABLED`), client, `safeNextPath`, hashed-key rate limiter; sessions never store IP addresses
│   ├── email/                - Resend sender and email templates
│   ├── feedback/             - Feedback schemas, client API, prompt cooldowns, Slack notifications (`SLACK_FEEDBACK_WEBHOOK_URL`)
│   └── tracking/             - Event tracking and analytics
└── test/                     - Test setup and utilities
```

## Key Architecture Patterns

### Image Export

All three exports (calendar, monthly, statistics) come in two fixed canvas sizes, saved at `pixelRatio: 2`:

| Format                | Canvas    | JPEG      |
| --------------------- | --------- | --------- |
| Story (9:16, default) | 1080×1920 | 2160×3840 |
| Feed (3:4)            | 1080×1440 | 2160×2880 |

1. The hook builds the export's layout component for the chosen format (`settings.exportFormat`)
2. `renderExportImage` mounts it off-screen in its own React root at the exact canvas size
3. Render to JPEG via `html-to-image` with `skipFonts: true` (avoids CORS errors with Google Fonts)
4. Present in ImagePreviewModal, where the Story/Feed picker re-renders the image in the other format

Every layout sits in `ExportFrame`, which owns the outer padding, the title and divider, and the watermark at a fixed canvas pixel size. All sizes and the fill-the-canvas maths live in `lib/export-canvas.ts`; layouts take explicit pixel sizes from there, never responsive Tailwind sizes, so exports look the same from any screen width.

The stats video in the animated video preview ends on a copy of the Story stats export. Its `StatsCard` takes the same sizes from `getStatsLayout('story', …)` and the same fitting helpers, but sets colours inline from the video palette rather than reusing the Tailwind export components, because the video's Dark/Light switch is independent of the site's `.dark` class. `VideoCards.test.tsx` fails if the card and the export drift apart.

### Dark Mode

Uses Material Design elevation hierarchy:

- `#0a0a0a` (page background) → `#141414` (cards) → `#1a1a1a` (elevated surfaces) → `#222222` (hover)
- Zinc color scale for text: zinc-100 (headings), zinc-400 (secondary), zinc-500 (muted)
- Borders: `white/8` throughout
- Calendar and exports use pure black (`#000000`) background in dark mode
- Light-mode exports use pure white (`#ffffff`); both export backgrounds live in `EXPORT_BACKGROUND` (`lib/constants.ts`)

### Data Flow

- Calendar data stored in LocalStorage with Zod schema validation
- Settings managed via React Context (SettingsContext)
- Undo stack (10 levels) for visit removal
- Import/export as JSON
- Signed-in people also get their calendar saved to their account and synced across devices; see Calendar sync in `docs/04-database-and-accounts.md`

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
