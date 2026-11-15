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
- **Emoji images**: `npm run emoji:build` downloads the Noto Emoji SVGs at the commit pinned in `scripts/build-emoji-images.mts`, adjusts their colours, crops the flags to one shared box and writes two WebP sizes to `public/emoji/` plus the manifest `src/lib/emoji-images.ts`. Commit its output; the raw SVGs stay in `node_modules/.cache`. Adding a country to `src/lib/countries.ts` needs a rebuild, or the country drops out of `COUNTRIES`
- **Paid video renders**: `npm run video:bundle` bundles `src/video-render` with the fonts and `public/emoji` into `.video-render/bundle`; `node scripts/video-render.mts snapshot | sample --snapshot <id> | delete-snapshot <id>` makes a Vercel Sandbox snapshot from it and renders the example videos into `.video-render/out`. `prepare` runs in `vercel-build` and gives each deployment its snapshot. Sandbox calls need `VERCEL_OIDC_TOKEN` from `vercel env pull`, kept outside the repo and passed with `node --env-file`. Delete test snapshots afterwards. See Rendering in `docs/06-paid-videos.md`
- **Database migration**: `npm run db:generate -- --name <name>` writes a SQL migration in `drizzle/` from `src/lib/db/schema.ts`; `npm run db:migrate` applies it. Vercel runs `vercel-build`, which migrates before building, so every migration must work with the code already deployed (add first, remove later)
- **Install**: `.npmrc` sets `legacy-peer-deps=true`, because Better Auth's optional framework peers (SvelteKit, TanStack Start) want Vite 8 and the tests use Vite 7. That also leaves peers unresolved, so `ajv` 8 is a direct dev dependency for webpack's `ajv-keywords` (ESLint keeps its own `ajv` 6)

## Tech Stack

- **Framework**: Next.js 16.4 with App Router
- **React**: 19.2
- **TypeScript**: v5 with strict mode enabled
- **Styling**: Tailwind CSS v4 with PostCSS
- **UI**: Radix UI primitives + shadcn/ui components
- **Animations**: Motion (Framer Motion)
- **Image export**: html-to-image (toSvg), drawn to a canvas
- **Emoji**: every flag and emoji is an image from Google's Noto Emoji (waved flags), never an emoji font, so they look the same on every platform. Images live in `public/emoji/` with their LICENSE (Apache 2.0) and README; their names carry a content hash, so `next.config.ts` caches them for a year. The credit is at the bottom of `/privacy`; Apache 2.0 needs the licence copy and the note about changed colours, not a credit on every page
- **Validation**: Zod
- **Database**: Postgres on Neon through Drizzle for accounts and new data; MongoDB for tracking events, feedback, waitlist and reminders until they move (see `docs/04-database-and-accounts.md`)
- **Auth**: Better Auth (version pinned exactly), optional accounts with a 6-digit email code or Google (hidden in in-app browsers); no passwords. Accounts are always on, so every environment needs `DATABASE_URL` and `BETTER_AUTH_SECRET`. Signed-in checks are answered from a signed session cookie for 5 minutes, so browsing doesn't wake Neon; `/api/calendar` skips that cache and checks the database. Pages, access rules and flows are in `docs/04-database-and-accounts.md`
- **Email**: Resend (`RESEND_API_KEY`, `EMAIL_FROM`); without a key in development, emails are logged to the console. Every email is built with `lib/email/layout.ts` (logo, serif heading, pill button, dark mode). The logo is a PNG at `public/email/logo.png`, drawn from `src/assets/logo.svg` on a white rounded tile so it stays visible when Gmail or Outlook darken the email; emails already sent load it from production, so never move or delete it
- **Observability**: Sentry (`@sentry/nextjs`, project `szilard-dobai/yearly`, EU region). Init in `src/instrumentation-client.ts`, `src/sentry.server.config.ts`, `src/sentry.edge.config.ts` and `src/instrumentation.ts`; shared options in `src/lib/sentry.ts`. `NEXT_PUBLIC_SENTRY_DSN` turns it on, `SENTRY_AUTH_TOKEN` uploads source maps at build. Errors, tracing (every trace in development, 10% elsewhere; off in the browser when Share usage stats is off), logs, and automatic check-ins for Vercel crons. No user info, cookies, request bodies, query values or server headers are sent, and the project drops IP addresses. Server `console.error` calls become Sentry errors. Alerts: Sentry emails the owner about new, returning and spiking production errors. Because the free plan can't post to Slack, `.github/workflows/sentry-slack.yml` runs `scripts/sentry-to-slack.mts` every 15 minutes and posts the same kinds of issues to the alerts channel (secrets `SENTRY_READ_TOKEN` and `SLACK_ALERTS_WEBHOOK_URL`). Uptime monitors call `/api/health` (`src/lib/health.ts`): 200 when the server runs and has its required settings, 503 otherwise. It must never query a database, so frequent checks don't keep Neon awake, and it's excluded from tracing
- **Background jobs**: Vercel Workflow (`workflow`, wrapped around the config in `next.config.ts` with `withWorkflow`). It generates routes into `src/app/.well-known/workflow/` during dev and build, which git and ESLint ignore. Paid videos render through it (`lib/video-render/`)
- **File storage**: Vercel Blob. `yearly-videos` is private and holds the paid videos; code reaches it with the OIDC token and `VIDEOS_BLOB_STORE_ID`, passed explicitly. `yearly-blob` (Production) and `yearly-blob-dev` (Preview, Development) are public and set `BLOB_READ_WRITE_TOKEN`, which the Blob SDK falls back to when it has no OIDC token and store ID
- **Testing**: Vitest + Testing Library; database tests use PGlite with the real migrations (`src/test/db.ts`) and need `// @vitest-environment node`. `retention.mongodb.test.ts` runs against a real MongoDB only when `MONGO_TEST_URL` is set (e.g. `docker run -d --rm -p 27099:27017 mongo:8`, then `MONGO_TEST_URL=mongodb://localhost:27099 npx vitest run src/lib/retention.mongodb.test.ts`); it uses its own throwaway database

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
│   ├── terms/page.tsx        - Terms; 404 until accounts are on
│   └── api/                  - API routes (tracking, feedback, Better Auth at api/auth/[...all], the signed-in calendar at api/calendar, admin auth/devices, admin example video renders at api/admin/video-renders, video orders and updates at api/videos/orders, the Polar webhook at api/webhooks/polar (`POLAR_WEBHOOK_SECRET`); admin-only DELETE on events, feedback and whole devices; the year-end reminder cron at api/cron/year-end-reminders and its admin actions at api/reminders/send and api/reminders/test-email; the video launch email at api/waitlist/launch-email and its one-click unsubscribe at api/waitlist/unsubscribe)
├── components/
│   ├── CalendarGrid.tsx      - 12-month calendar display
│   ├── TripCountdown.tsx     - Countdown to the next trip, "Have fun in…" while one is on
│   ├── TravelNudgeCard.tsx   - Compares the last two months and nudges towards planning a trip
│   ├── YearExportLayout.tsx  - Full-year export layout (Story 1080×1920 or Feed 1080×1440)
│   ├── MonthlyExportLayout.tsx - Monthly export layout (Story 1080×1920 or Feed 1080×1440)
│   ├── StatisticsExportLayout.tsx - Statistics export layout (Story 1080×1920 or Feed 1080×1440)
│   ├── export/               - Shared export frame (padding, title, watermark), stat tiles and ranking rows
│   ├── ImagePreviewModal.tsx - Export preview, Story/Feed format picker and download modal
│   ├── ExportWatermark.tsx   - "made with yearly.world" signature drawn by the export frame
│   ├── video/                - Remotion compositions for the animated video preview (year, month, stats); the paid video flow in the export dialog (`useVideoPurchase`, `SaveVideoButton`, `PackVideoPlayer`) and `VideoSalesProvider` (root layout)
│   ├── HomepageExamples.tsx  - Homepage section with real example exports
│   ├── HomepageExampleImage.tsx - Shows the light or dark example once the colour scheme is known, so only one image loads; tapping it opens the original full size
│   ├── Emoji.tsx             - The one image component for flags (`Flag`, `DayFlags` for one or two countries) and named emoji (`Emoji`); `size` works like a font size, or leave it out to follow the text; `resolution="large"` in exports and video, Remotion's `Img` via `as` in compositions
│   ├── CountryInput.tsx      - Country and date picker
│   ├── Statistics.tsx        - Travel statistics display
│   ├── MobileFab.tsx         - Mobile floating action button
│   ├── FeedbackDialog.tsx    - Feedback form (star rating + message)
│   ├── FeedbackPrompt.tsx    - Inline post-download rating prompt
│   ├── FeedbackCard.tsx      - Rating card on the create page, hidden once the user rates or dismisses
│   ├── account/              - Sign-in form (email, then code; or Google), header avatar (`AccountMenu`), `/create` prompt, account page cards (calendar, sign out, delete), first-sync dialog
│   ├── admin/                - Admin-only components (login, nav, dialogs, delete confirmation, shared event badges and tiles; the year-end reminder panel with "Send a test" and "Run now")
│   └── ui/                   - Reusable UI primitives (shadcn/ui)
├── lib/
│   ├── types.ts              - Core types (Country, CountryVisit, CalendarData)
│   ├── constants.ts          - Month names, flag sizes
│   ├── calendar.ts           - Calendar grid calculations
│   ├── trips.ts              - Day map and trip grouping (back-to-back days = one trip), trip status
│   ├── nudges.ts             - Month-on-month comparison behind the travel nudge
│   ├── export-canvas.ts      - Export formats, canvas sizes, shared frame and layout maths
│   ├── export-render.tsx     - Mounts an export layout off-screen and renders it to JPEG
│   ├── emoji.ts              - Flag and emoji image paths, sizes and medal names
│   ├── emoji-images.ts       - Generated manifest of the images in `public/emoji/` (don't edit; run `npm run emoji:build`)
│   ├── statistics.ts         - 30+ statistics calculation functions
│   ├── countries.ts          - Country data and lookup
│   ├── storage.ts            - LocalStorage persistence with Zod validation
│   ├── hooks/
│   │   ├── useExportImage.ts       - Shared export state: format, preview, re-render on format change
│   │   ├── useImageExport.ts       - Full-year calendar export
│   │   ├── useMonthlyExport.ts     - Monthly calendar export
│   │   ├── useStatisticsExport.ts  - Statistics image export
│   │   ├── useAccountPrompt.ts     - When the /create account prompt shows (3+ days of trips, 30-day snooze)
│   │   ├── useStatusFeedback.ts    - Loading/error state management
│   │   └── useTodayKey.ts          - Today's local date key, null on the server and during hydration, so date-based cards render only in the browser
│   ├── videos/               - Paid video packs: orders, renders and free credits in Postgres, Polar checkout and product IDs (`POLAR_ACCESS_TOKEN`, `POLAR_ENVIRONMENT`), the 80% update rule, starting renders, order summaries with signed links; everything is off unless `VIDEO_SALES_ENABLED=true` and accounts are on. Browser side: `client.ts` (API calls), `useVideoOrder` (polling), `save.ts` (share sheet or download), `checkout-return.ts` (Polar's `customer_session_token` is stripped in `instrumentation-client.ts` before anything else runs)
│   ├── video-render/         - Paid video rendering: `renderVideoPack` workflow (one step per video: sandbox from the deployment's snapshot, render, upload to the private videos store), packs, signed download links, the deployment's snapshot ID (written by `scripts/video-render.mts prepare`)
│   ├── retention.ts          - Retention rules (26 months in full, then identifiers removed; 5 years max), run daily by `api/cron/retention` (`vercel.json`, `CRON_SECRET`)
│   ├── contexts/
│   │   └── SettingsContext.tsx      - User preferences (theme, week start, export format)
│   ├── db/                   - Drizzle client (`DATABASE_URL`) and schema; `auth-schema.ts` is generated by `npx auth@<better-auth version> generate`
│   ├── calendar-sync/        - Syncs the local calendar with the signed-in account: day-map format, three-way merge, versioned saves to `/api/calendar`, `useCalendarSync` for /create
│   ├── auth/                 - Better Auth config (`BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`), client, `safeNextPath`, hashed-key rate limiter; sessions never store IP addresses, and Google's photo and tokens aren't kept (the name is, for avatar initials); each new account posts the sign-up method, country and account count to `SLACK_FEEDBACK_WEBHOOK_URL` (`slack.ts`), never the email or name; every Slack message shows country, never region
│   ├── email/                - Resend sender (`sendEmail` takes an idempotency key and extra headers, and throws `EmailSendError` with Resend's error code), the bulk send shared by the year-end reminder and the video launch email (`bulk-send.ts` loop, `bulk-send-store.ts` MongoDB claims), and email templates (sign-in code, year-end reminder, video launch) on the shared `layout.ts`
│   ├── reminders/            - Year-end reminder: sign-up card helpers, dates (`date.ts`: the reminder date, when sign-ups close, the send window), and the send (`send.ts` and `send-store.ts` wrap the shared bulk send in `lib/email`, `send-run.ts` production and date checks); see Year-end reminder email below
│   ├── feedback/             - Feedback schemas, client API, prompt cooldowns, Slack notifications (`SLACK_FEEDBACK_WEBHOOK_URL`)
│   └── tracking/             - Event tracking and analytics; `opt-out.ts` backs the Share usage stats setting, which also stops Vercel Analytics (`components/SiteAnalytics.tsx`)
├── test/                     - Test setup and utilities
└── video-render/             - Remotion entry for server renders of the paid videos: the `year`, `stats` and `month` compositions without the preview watermark, with Geist and Newsreader bundled; built by `scripts/video-render.mts`, not by Next
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
3. Turn it into an SVG with `html-to-image` (`toSvg`, `skipFonts: true` avoids CORS errors with Google Fonts), draw that to a canvas, then draw the flag and emoji images on top at their measured positions and clip paths, and save as JPEG. WebKit leaves images inside such an SVG blank on the first draw, so the images are hidden in the SVG and drawn separately
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
- Signed-in people also get their calendar saved to their account and synced across devices; see Calendar sync in `docs/04-database-and-accounts.md`

### Year-end reminder email

People can ask on the export modal for one email on `REMINDER_DATE` (1 Dec). `/privacy` and the card promise one email per address per year, only a reminder (nothing promoted in it), and deletion at the end of the year.

- **Sign-ups** for a year close at noon UTC on its reminder date, once 1 Dec has begun in every time zone (`isOpenReminderYear`); the card already hides at local midnight. Next year stays open
- **Sending** (`GET /api/cron/year-end-reminders`, `CRON_SECRET`): only when `VERCEL_ENV === 'production'` and only from the reminder date for `REMINDER_SEND_DAYS` days (UTC); any other call does nothing and says why. `?dryRun=1` counts what it would send, on any day and in any environment, and sends nothing
- **No double sends**: each reminder is claimed with `findOneAndUpdate` (`sendClaimedAt`, `sendAttempts`, `sendFirstClaimedAt` for the key's first use, `sendMaybeSent`), sent with the idempotency key `year-end-reminder/<year>/<_id>`, then marked `sentAt` with `sendEmailId`. Once an attempt may have gone out (a crash, a timeout or a 5xx), it's only retried within 23 hours of the key's first use, because Resend forgets keys after 24; after that it counts as "won't be retried" in admin and is never resent automatically. Attempts that certainly didn't go out (Resend refused them, or quota, rate-limit and configuration errors, which stop the run without using up an attempt) can be retried on any later run, after 10 minutes. Failures keep only Resend's error code (`sendError`, `sendFailedAt`), up to `MAX_SEND_ATTEMPTS`
- **Pacing**: at most 4 sends a second (Resend allows 10 per team, shared with sign-in codes), and each run stops at its time budget (240 s of the cron's 300 s; 40 s from admin) and leaves the rest for the next run
- **Schedule** (`vercel.json`): 08:00 and 14:00 UTC on 1 Dec, 08:00 on 2 Dec, 05:00 on 3 Dec. Hobby starts crons up to 59 minutes late; `date.test.ts` checks the entries against `REMINDER_DATE` and Resend's idempotency window, so move them together. Keep a run on the reminder date after sign-ups close
- **Signed in**: the card has no email field and uses the account's, because the API takes the session's email over the one sent. `/account` shows the reminder with Remind me or Turn off until sign-ups close. `GET` and `DELETE /api/reminders?year=` read and remove the signed-in email's reminder. The video waitlist works the same way (`/api/waitlist?feature=`, "Remove me from the list")
- **Admin** (Year-end reminders panel): sent, failed and left; "Send a test" emails the template to a typed address without saving it or marking anything; "Run now" calls the same send as the cron (same production and date checks)
- **Slack**: after a run that sent or failed something, counts only go to `SLACK_FEEDBACK_WEBHOOK_URL`. Addresses never go to logs, Sentry, Slack or URLs
- **Retention**: `applyMongoRetention` deletes past years' reminders, send status included, every day

### Video launch email

One email to the video waitlist when videos launch, sent from the admin's Video launch email panel ("Send a test", "Run now"); details in `docs/06-paid-videos.md`.

- It only delivers the free video the waitlist form promised ("We'll email you once, when videos are ready"), which makes it a transactional email under CAN-SPAM, so it needs no postal address. Keep prices, other packs and anything else to buy out of its subject and body (`video-launch.test.ts` checks), or it turns into a marketing email that must show one. It still has an unsubscribe link
- `lib/waitlist/launch-send.ts` refuses to send outside production, with video sales off, without `BETTER_AUTH_SECRET` or after `FREE_VIDEO_LAST_DAY`
- Unsubscribe links (`/unsubscribe` and the one-click `List-Unsubscribe` header) carry the waitlist ID signed with a key derived from `BETTER_AUTH_SECRET`, never the address; `POST /api/waitlist/unsubscribe` deletes the entry and skips the same-origin check because mail apps call it
- The send reuses the reminder's claims and idempotency keys (`video-launch/<_id>`), so nobody gets two

### Privacy

- Collecting something new, adding a vendor or changing retention means updating `src/app/privacy/page.tsx` and `docs/05-record-of-processing.md` in the same PR
- Never put personal data (trip dates, countries, emails) in `aria-label`, `title` or `alt` without checking `scrubBreadcrumb` / `scrubSpan` in `lib/sentry.ts`, which strip those attributes before Sentry sends anything
- If personal data leaks, follow the data breach runbook, which the owner keeps in Google Drive rather than this public repo; ANSPDCP must hear within 72 hours

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
- **Emoji**: never type emoji characters into the interface, exports or video. Add the emoji to `EMOJI` in `scripts/build-emoji-images.mts`, run `npm run emoji:build` and use `<Emoji name="…" />`. Slack messages keep plain-text emoji
