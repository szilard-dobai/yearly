# Decision: Paid animated videos

- **Status:** Accepted
- **Date:** 15 November 2026
- **Owner:** Szilard

## Context

Since 6 November, the export dialog has offered an animated video of your year, your stats or a month. It's a fake door: a watermarked Remotion preview, a "Get the videos" button with a $1.99 / $2.99 price split per device, and an email waitlist. From 10 November the waitlist has promised the first video free at launch, and the dialog and homepage say videos arrive in early December.

Year-in-review sharing peaks in late December and early January, so real checkout has to be live in early December. Accounts launch on 23 November (`docs/04-database-and-accounts.md`), and purchases build on them.

## Decision

| Part      | Choice                                                                          | Why                                                                                                                                                                                                                     |
| --------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Products  | **Year pack** and **month pack**, $2.99 each                                    | Both videos already exist. One price, no split. Card fees make $1.99 lose about 30%                                                                                                                                     |
| Payments  | **Polar**, as merchant of record                                                | Handles sales tax and VAT. Accepts individuals, fast approval, an official Better Auth plugin, a hosted checkout with Apple Pay and Google Pay                                                                          |
| Rendering | **Vercel Sandbox** (`@remotion/vercel`), run by **Vercel Workflow**             | Stays on Vercel with one bill. Pay per render, no server to run. Workflow retries failed steps and waits without keeping Neon awake                                                                                     |
| Files     | **Vercel Blob**                                                                 | Where `@remotion/vercel` uploads to. Downloads go through our own route, which checks the owner                                                                                                                         |
| Flags     | **Noto Color waved flags, colours muted**, the same images in preview and video | Apple Color Emoji can't be used on a server. Noto's waved flags look closest to Apple's once toned down                                                                                                                 |
| Account   | **Sign in before paying** (product rule 3 in `docs/04`)                         | Download again, update the video, claim the free video with a checked email. A guest checkout that creates the account from the payment email would let anyone pay with someone else's email and get into their account |

### What people buy

- **Year pack:** the year video and the stats video, each in dark and light. Four 1080×1920 MP4s.
- **Month pack:** the month video in dark and light. Two MP4s.
- **No basket.** One pack per checkout.
- **A pack is for a period, not a fixed file.** People buying in early December will add Christmas trips afterwards, so a pack can be updated:
  - Up to **3 updates** per pack.
  - Each update must keep **at least 80% of the days in the first video** (days with any country). Always compare with the first video, not the last update, so it can't drift a bit at a time. Adding trips and fixing a wrong country pass; a friend's calendar has different days and fails, and the dialog offers a new pack instead.
  - No end date.
- Buying the same period again is allowed, for example after using all 3 updates.

### Free first video

- **Everyone on the video waitlist** gets one free pack, year or month, their choice. That includes people who joined before 10 November, who were promised nothing.
- At launch, the waitlist emails (deduplicated) are copied from MongoDB into `video_credit`. The waitlist form is replaced by the buy button at the same time, so no new credits are created.
- Signing in with a matching, checked email shows "Your first video is free" and skips checkout. The credit row is deleted when the order is created, so the email isn't kept once it's used.
- A credit can't be claimed by someone else, because signing in needs the code sent to that inbox.
- Free packs follow the same update rules as paid ones.
- The launch email goes to the whole waitlist through Resend. The free plan allows 100 emails a day, shared with sign-in codes, so either send in batches or move to Resend Pro first.
- **Launch email** (admin, Video launch email panel): "Send a test" emails it to a typed address; "Run now" sends it for up to 40 s per click, with the same claims and idempotency keys as the year-end reminder (`lib/email/bulk-send.ts`), so nobody gets two and a quota error just stops the run until the next click. It only sends from production, with video sales on, `BETTER_AUTH_SECRET` set and before the free offer ends. Import the credits first.
- The email names the last free day, `FREE_VIDEO_LAST_DAY` in `lib/video-offer.ts`; pass the same date to the credits import's `--expires`.
- It only delivers what the waitlist was promised: the form said "first video free at launch. We'll email you once, when videos are ready." The subject and the opening are about the free video, and nothing is for sale in it, so under CAN-SPAM it's a transactional message (delivering something the recipient is entitled to) and needs no postal address. Adding prices, paid packs or other promotions would make it a marketing email, which would need a postal address. EU law has no postal address rule for email; it wants the sender named and an easy way out, so the email still has an unsubscribe link to `/unsubscribe` and `List-Unsubscribe` with one-click (RFC 8058) for mail apps. Unsubscribing deletes the waitlist entry; a free credit already imported stays. The links carry the waitlist ID signed with a key derived from `BETTER_AUTH_SECRET`, never the address.

## The journey

1. A visitor finds Yearly through the homepage teaser, `/videos` or Instagram, and makes a calendar on `/create` without an account.
2. In the export preview, **See it animated** opens the video dialog: the watermarked preview, year or stats, dark or light.
3. **Get my videos – $2.99.** Signed-out people sign in inside the dialog, with an email code or Google.
4. The first-sign-in sync dialog ("This device has trips that aren't in your account") can appear here. It must finish before checkout, and the purchase picks up the merged calendar.
5. With a credit: "Your first video is free", then straight to step 7.
6. Without one: the dialog saves a draft order with the video data it previewed, then sends the tab to Polar's hosted checkout (in the site's light or dark theme), with the account email filled in and the EU consent to immediate delivery of digital content. Paying brings the tab back to `/create?video_order=<id>`, which reopens the dialog on that order. See Export dialog below for why it's a redirect rather than an embedded checkout.
7. Polar's `order.paid` webhook marks the order paid and starts the Workflow run. The browser's return from checkout is never trusted for this.
8. The dialog shows "Making your videos, usually under a minute" and checks the status every few seconds. An email says when they're ready, so people in an in-app browser can close it.
9. The videos play without the watermark. **Save video** opens the share sheet on phones (Save to Photos) and downloads on desktop.
10. Later, on `/account`: download again, or **Update with my latest trips** (with the number of updates left).

Polar sends the receipt. We send the "ready" email, which links to `/account`. For the first version of a paid order, it also confirms that the buyer asked for immediate delivery and that this ended the 14-day right to cancel: EU law wants that confirmation on something the buyer keeps, and Polar's receipt may not repeat the checkout's checkbox answer.

## Export dialog

`AnimatedVideoDialog` keeps the waitlist exactly as it was unless `VIDEO_SALES_ENABLED=true`; the root layout passes the flag (and whether Google sign-in is set up) to the client through `VideoSalesProvider`, the way `AccountsEnabledProvider` does for accounts. With sales on:

- **Pack and price.** A year or stats preview sells the year pack, a month preview the month pack, at `VIDEO_PACK_PRICE`. Signed-in people see whether a free video is waiting (`GET /api/videos/orders`).
- **A pack they already have.** When the previewed period matches a paid order (a year or stats preview matches that year's pack, a month preview that month's pack), the dialog shows the pack instead of the offer: its videos with their posters, **Save video**, and **Update with my latest trips (N left)**, which posts the `/create` calendar for that period after a confirmation and follows the new version while the old one stays playable. `unchanged` reads "Your videos already include all your trips", `too-different` and running out of updates offer **Get a new pack**, which shows the offer again (buying the same period again is allowed) with a way back to the pack. Signed-out visitors see the offer, and the check runs again once they've signed in and their calendar is saved. The update controls are `PackUpdate`, shared with `/account`.
- **Sign-in in the dialog.** `SignInForm` with an email code stays on the page; `/create` then checks the session again (`useCalendarSync().checkSession`) and the buy button waits, as "Saving your calendar…", until the first sync has finished, including the "This device has trips" question, which opens over the video dialog. The order is then made from the merged calendar, and the preview redraws from it before anyone pays. Google leaves the page, so its return address is `/create?video=<kind>-<theme>-<year>[-<month>]`, which reopens the dialog where it was (`lib/videos/checkout-return.ts`). Google is hidden in in-app browsers, as on `/sign-in`.
- **Checkout is a redirect, not embedded.** Polar's embedded checkout (`@polar-sh/checkout`) only offers Apple Pay and Google Pay after Polar support enables wallets for our domain, needs every host listed under Settings → Embedding (production, each preview URL, localhost), and adds a third-party iframe inside Instagram's and TikTok's in-app browsers, where most of our traffic arrives. The hosted page has wallets out of the box, works in every browser, and we need the return path anyway for the email that links back. Before leaving, the dialog says "You'll pay on Polar's secure checkout". Coming back with the browser's back button restores the dialog from the back-forward cache and clears its "Opening checkout…" state. If embedding is wanted later, it can sit behind the same `checkoutUrl` once wallets are enabled for yearly.world.
- **Back from checkout.** Polar's back arrow returns to `/create?video_offer=<id>`. `/create` removes the parameter after hydration like `video_order`, loads the draft for its pack and period, records `animated_video_checkout_back`, and opens the dialog on the offer, so the buyer can try checkout again.
- **The return.** Polar adds `customer_session_token` to the success URL. `src/instrumentation-client.ts` removes it with `history.replaceState` before Sentry starts and before React hydrates, so neither Next's router, our tracking events, Sentry nor Vercel Analytics see it. `/create` then reads `video_order`, removes it after hydration (through Next's patched `replaceState`, so the router forgets it too), loads the order for its period and opens the dialog on it. Vercel Analytics' `beforeSend` also drops the token, `video_order` and `video_offer` from page URLs.
- **Progress.** The dialog checks `GET /api/videos/orders/<id>` every 3 seconds while it's open and the order is a draft, queued or rendering, and stops when it's ready or failed, when it closes, or after 4 minutes ("Still making your videos… we'll email you"). A draft is shown as "Confirming your payment", because the webhook can land a few seconds after the redirect. A failed render shows "We're on it" and never the error. A signed-out visitor on a return link is asked to sign in, and an order that isn't theirs reads as not found.
- **Ready.** The left side swaps the watermarked preview for the real MP4 (`<video playsInline muted autoPlay loop>`, with the render's poster when it has one), and the same Your year / Your stats and Dark / Light switches pick the file. **Save video** fetches the file into a `File` and, on phones and tablets where `navigator.canShare({ files })` is true, opens the share sheet (Save Video on iOS); everywhere else it downloads as `yearly-<year>-<video>-<theme>.mp4` or `yearly-<year>-<month>-<theme>.mp4`. On phones the selected file is fetched ahead, so the share sheet opens inside the tap; if a browser still refuses, the button asks for a second tap. Signed links last 10 minutes, so saving after 8 minutes fetches the order again first, and a video that fails to load fetches it once more.
- **Events** (no personal data, no order IDs): `animated_video_buy_click` (now with `signedIn`, and `free` once signed in), `animated_video_sign_in_shown`, `animated_video_checkout_opened`, `animated_video_free_claimed`, `animated_video_ready`, `animated_video_saved` (`share` or `download`), `animated_video_failed` (`stage: 'order'` with the reason, or `stage: 'render'`), `animated_video_checkout_back`, and `animated_video_update_requested` (the pack, the result and where it came from). A purchase of a period they already have adds `again: true` to the buy click. Sign-in events from the dialog carry `source: 'video'`.

## Account page

`/account` lists **Your videos** above the calendar card when sales are on: one card per paid pack (`GET /api/videos/orders`, newest first), with the period, the purchase date and the same player and **Save video** button as the dialog. Each card shows one file at a time (Your year / Your stats for a year pack, Dark / Light), with `preload="metadata"` and no autoplay, so a visit fetches only each file's metadata until someone presses play.

- **Update with my latest trips (N left)** asks for a confirmation that names the update it uses, then posts this device's calendar for that period. It's the synced calendar: the button stays disabled until the "Your calendar" card has finished syncing with the account, including the first-sync question. While the new version renders, the old videos stay playable and the card says "Updating your videos with your latest trips". The card then polls until it's ready.
- Refusals read in plain words: `busy` (already updating), `no-updates-left` (all 3 used, get a new pack), `too-different` (updates are for adding trips or fixing a country, so get a new pack for a different calendar). Anything else is "Try again in a moment".
- No packs: a line pointing to `/create`. A free video waiting shows "Your first video is free" with the same link.
- `animated_video_update_requested` records the pack and the result (`started` or the refusal).

## Rendering

### Pipeline

1. **Draft order.** Before checkout, `POST /api/videos/orders` (signed in, same origin, 10 an hour per account) takes the pack and period, the calendar's days (the day-map format of calendar sync) and the week start, validated with Zod: real country codes, the period, size limits. It keeps only the days in the period and stores them on render version 0. The render step builds the video data from them with the same `buildYearVideoData` / `buildMonthVideoData` as the preview, so people get exactly what they saw. A period with no trips is refused before anything is stored.
   - With a free credit (a matching, checked email), the order is created paid, the credit is marked used and the render starts at once.
   - Otherwise it's a draft, and the response carries a Polar checkout URL (`src/lib/videos/polar.ts`) with the account email filled in, `external_customer_id` set to the account ID, the order ID and period (`2026` or `2026-06`) in metadata, which Polar copies onto the order so its dashboard shows which year or month was bought, discount codes off `success_url` back to `/create?video_order=<id>` (show progress) and `return_url`, Polar's back arrow, to `/create?video_offer=<id>` (show the offer again).
   - Polar is called with `@polar-sh/sdk` directly rather than the Better Auth plugin, so only buyers become Polar customers, not everyone who signs in. Product IDs for production and sandbox are in the code; `POLAR_ENVIRONMENT` picks one.
2. **Payment.** `POST /api/webhooks/polar` verifies Polar's signature. `order.paid` with our order ID moves the draft to paid (once; a repeat finds it already paid) and starts the render. Only one caller can claim a render's start, and a failed start is released, so Polar's retry starts it. `order.refunded` (full refunds only) marks the order refunded and deletes its renders, trips and videos. `GET /api/videos/orders/<id>` also starts a paid render that never started, as a safety net.
3. **Workflow run** (`renderVideoPack` in `src/lib/video-render/workflow.ts`), one per version (the first render or an update). Built and tested with example data; orders aren't connected yet.
   1. One step per video, all in parallel (4 for a year pack, 2 for a month pack). Each restores a sandbox from the deployment's snapshot with 4 vCPU, renders with `concurrency: 4` and waits for it (about 15–20 s), reads the MP4 back and uploads it to the private videos store. The step's function waiting is cheaper and simpler than a detached render with polling, and the sandbox never holds Blob credentials.
   2. Each step stops its sandbox when it finishes or fails.
   3. Mark the render ready in Postgres and send the email (not built yet).
   4. A failed step retries up to 6 times, 5 s apart and doubling (about 5 minutes in all), which also covers Sandbox's rate limit after the launch email. A deployment without a snapshot, or a render with nothing to render, fails at once. After the last retry: mark it failed, alert Sentry and Slack, and refund from Polar if it can't be fixed the same day. The buyer sees "We're on it, we'll email you", never an error message.
   5. Run inputs and outputs hold only the render ID, the pack and Blob paths. The step loads the trip data itself (from Postgres once orders exist), so trip data isn't copied into Workflow's run history.
4. **Updates** post new video data to the pack. The server refuses one that changes nothing compared with the newest ready version (`unchanged`), so nobody uses one up by accident, then checks the 80% rule and the update count, and starts a new run. If the latest version failed, the update replaces it instead of adding a version, so a failed render doesn't use up an update.
5. **Posters.** After each video, the same sandbox renders a JPEG of its finished frame (the frame the homepage shows with reduced motion, `stillFrame` in `src/components/video/still-frame.ts`), stored next to the MP4 and deleted with it. Order summaries give it as `posterUrl`. If the still fails, the video is still delivered without one.

### Setup

Everything under `/api/videos` and the webhook returns 404 unless `VIDEO_SALES_ENABLED=true` (and accounts are on). `/privacy` and `/terms` show the purchase sections only then too.

| Variable               | Production                  | Preview and Development  |
| ---------------------- | --------------------------- | ------------------------ |
| `VIDEO_SALES_ENABLED`  | `true` at launch            | `true` to test           |
| `POLAR_ACCESS_TOKEN`   | production token            | sandbox token            |
| `POLAR_ENVIRONMENT`    | `production`                | `sandbox`                |
| `POLAR_WEBHOOK_SECRET` | from the production webhook | from the sandbox webhook |

Webhook endpoints, subscribed to `order.paid` and `order.refunded`:

- Production: `https://www.yearly.world/api/webhooks/polar`.
- Sandbox: a preview URL. Previews are behind Vercel Authentication, which Polar can't pass, so add `?x-vercel-protection-bypass=<secret>` from Vercel's Protection Bypass for Automation.

Neon is touched when the order is created, when it's paid, when the render is ready, and while the buyer's dialog checks the status. There is no per-minute cron and no job queue checking Postgres: each check keeps Neon awake for 5 minutes, so a per-minute cron would use all ~730 hours of a month, against 100 on the free plan.

The daily `/api/cron/retention` job also deletes unpaid draft orders older than a day, and alerts Slack about any render stuck for over an hour.

### Video code

- `src/video-render/entry.ts` registers the `year`, `stats` and `month` compositions (the `VideoKind` names) with `YearFillVideo`, `StatsVideo` and `MonthVideo`, without `PreviewWatermark`. The preview and the server use the same components, and `Root.test.tsx` checks the server's durations match the preview's. With no input props, each renders the homepage example year.
- Geist and Newsreader come from the `@fontsource-variable` packages, because the `next/font` CSS variables don't exist outside the app. `src/video-render/fonts.ts` loads every face before the first frame.
- Every flag and medal is an image under `/emoji/` (PR #69), and the sandbox has no emoji font, so `npm run video:bundle` copies `public/emoji` into the bundle.
- `scripts/video-render.mts` bundles (`npm run video:bundle`, about 3 s, 37 MB), makes a snapshot, renders sample videos and deletes snapshots. Sandbox calls need a `VERCEL_OIDC_TOKEN` from `vercel env pull`, kept outside the repo.
- **Deploy-time snapshot.** `vercel-build` runs `node scripts/video-render.mts prepare` before `next build`. It bundles, hashes the bundle, and reuses the snapshot for that hash or makes one (about 1 minute), then writes its ID into `src/lib/video-render/deployment-snapshot.json`, so each deployment renders with its own code. The hash-to-snapshot index lives in the videos store under `render-snapshots/`. Production snapshots last until a later production build prunes them (the newest two are kept, for one rollback); preview snapshots expire after 48 hours, and previews reuse production's when the video code is unchanged. A failed `prepare` fails a production build but only warns on a preview. `VIDEO_RENDER_SNAPSHOT=off` skips it in an emergency, leaving that deployment unable to render. Locally, `VIDEO_SNAPSHOT_ID` sets the snapshot.
- **Videos store.** `yearly-videos`, a private Blob store in `fra1`, connected to every environment with the prefix `VIDEOS_BLOB` and no read-write token. Code reaches it with the deployment's OIDC token and `VIDEOS_BLOB_STORE_ID`, passed explicitly so a missing token fails instead of falling back to the public store's `BLOB_READ_WRITE_TOKEN`. Files live at `<environment>/renders/<renderId>/<kind>-<theme>.mp4`. A plain file URL returns 403; downloads use 10-minute signed links, made only after the account is checked.
- **Admin test.** `POST /api/admin/video-renders` with `{ "pack": "year" }` renders the example year; `GET /api/admin/video-renders/<runId>` returns the status and signed links. Run locally with `next dev`, a fresh `VERCEL_OIDC_TOKEN`, `VIDEOS_BLOB_STORE_ID` and `VIDEO_SNAPSHOT_ID`, a year pack took 16 s from start to four MP4s in the store.
- Pin `@remotion/vercel`, `remotion` and `@remotion/bundler` at one version (4.0.541), and `@vercel/sandbox` at 1.6.0. Remotion marks `@remotion/vercel` experimental, and newer `@vercel/sandbox` versions replace the runtimes it relies on. In 4.0.541, `addBundleToSandbox` creates subfolders before the bundle folder, so the script makes that folder first.
- **Snapshots, not fresh sandboxes.** `createSandbox()` installs system packages, glibc, Chrome and npm packages from the internet on every call, which takes about 37 s and depends on outside services. A snapshot (about 0.74 GB, about 1 minute to make) restores in under a second. Build snapshots only in production and only when the bundle changes, and delete old ones: they last until deleted unless they're given an expiry, Hobby allows 15 GB for the account's lifetime, and Pro charges about $0.06 a month each. A snapshot belongs to one region.
- First server render of the real compositions (15 November): the three example videos, one sandbox each, took 18.8 s from snapshot to MP4s on this machine, in dark and in light. Fonts, flags and medals match the preview.

### Render test (15 November)

The homepage example trips (10 countries, 67 days), 1080×1920 at 30 fps, in `fra1`. 46 renders on 42 sandboxes, none failed.

| Pack                             | Wall-clock (start to all MP4s) | Cost (fra1, Pro rates) | Files  |
| -------------------------------- | ------------------------------ | ---------------------- | ------ |
| Year: 4 sandboxes × 4 vCPU       | 15.5–16.1 s                    | about 2.4¢             | 5.1 MB |
| Year: 1 sandbox, videos in turn  | 53 s                           | about 1.1¢             |        |
| Month: 2 sandboxes × 4 vCPU      | 12.5–13.0 s                    | about 1.1¢             | 1.5 MB |
| Month: 1 sandbox, videos in turn | 22 s                           | about 0.7¢             |        |

- Chrome is the bottleneck, not encoding. 4 vCPU with `concurrency: 4` is the fastest setup on Hobby (8 vCPU wasn't available to test).
- Most of the parallel setup's cost is memory: each sandbox is billed for at least a minute. One sandbox per video is worth it because the buyer is watching the progress.
- Restoring a snapshot takes 0.7–1.3 s; Chrome starting and picking the composition about 1.5 s per render.
- Limits: Hobby allows 10 sandboxes at once. Pro starts at 150 new vCPU a minute, about 9 year packs a minute.

### Flags

- Source: `third_party/region-flags/waved-svg` in `googlefonts/noto-emoji` (262 flags).
- A script applies the colour change and saves each flag as small images in `public/`: one size for small flags in the app, one about twice the largest size exports and videos draw. The adjustment matches CSS `saturate(0.82) contrast(0.92) brightness(1.02)`: whites stay white, the navy gets lighter, reds and yellow get softer.
- Built into the files, not applied as a live CSS filter: the preview in Safari and the server render then match, and nothing extra is drawn on each frame.
- **Used everywhere, not only in videos:** the `/create` calendar, the image exports, the country picker, the admin pages and the Open Graph image all use these images, so every platform shows the same flags (Windows has no flag emoji at all). The Settings choice between emoji and flag icons goes away, and the app's other emoji (medals, section icons) become Noto images too. Slack messages keep plain emoji. This is a separate change from video checkout.
- **Licence:** the flag designs are public domain. The waving was added by the Noto project, so we treat the waved files as Apache 2.0, like Noto's other images. That means a credit with the licence and a note that the colours were changed, on a credits section of the site or in `/terms`, and no use of Google's or Noto's names in marketing.
- Shading to imitate Apple's gloss was tried and left out: it barely shows at year-calendar size, and as a live effect it needs masks that Remotion doesn't wait for.

## Data

New Postgres tables (names follow the existing singular style):

| Table          | Holds                                                                                                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `video_order`  | User, pack (`year` or `month`, year, month), source (`polar` or `credit`), status (`draft`, `paid`, `refunded`), Polar checkout and order IDs, amount, updates used, times       |
| `video_render` | Order, version (0 for the first, 1–3 for updates), the video data it was made from, status (`queued`, `rendering`, `ready`, `failed`), Workflow run ID, Blob paths, error, times |
| `video_credit` | Email, source (`waitlist`), expiry. The row is deleted when the free video is used                                                                                               |

- Deleting an account deletes its orders, renders and their Blob files. Blob files aren't removed by the database cascade, so Better Auth's `beforeDelete` hook deletes them first (`src/lib/videos/delete.ts`); if that fails, the account isn't deleted.
- The daily retention cron deletes drafts older than a day and credits past their expiry.
- When an update is ready, the previous version's files are deleted and its row forgets them.
- Polar is the seller and keeps the tax records, so our rows don't need to outlive the account.
- Collecting purchases and storing trip data with them means updating `/privacy` and `docs/05-record-of-processing.md` in the same PR, with Polar as an independent controller and Vercel Sandbox, Workflow and Blob as processors. Sandboxes run in Frankfurt (`fra1`, the project's default region), so trip data stays in the EU.

## Pages

| Page                     | What changes                                                                                                                                                         |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/videos` (new, indexed) | What the videos are, example videos from the homepage example trips, the price, what's included, updates, refunds. Polar checks for this page before approving us    |
| Export dialog            | Buy button with the real price, sign-in step, free credit, checkout, progress, the finished videos. Remove "One-time payment, no account needed" and the price split |
| `/account`               | **Your videos**: one card per pack with each file to download and **Update with my latest trips (N left)**                                                           |
| `/terms`                 | Purchases, refunds (a refund if a video fails or comes out wrong; otherwise the EU right to cancel ends with the consent at checkout), seller details                |
| `/privacy`               | Purchases, the trip data kept with them, Polar, Sandbox, Workflow and Blob                                                                                           |
| Credits (`/privacy`)     | Noto Emoji, Apache License 2.0, colours adjusted                                                                                                                     |
| `/admin`                 | Orders: status, render errors, run a render again, link to the Polar order for refunds                                                                               |

User-facing copy is written with the `copywriting` and `cro` skills against `.agents/product-marketing.md`.

## Costs

Per sale, at $2.99:

| Item                       | Cost                                                                                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Tax                        | Included in the $2.99 everywhere except the US, Canada and India, where it's added on top. An EU buyer at 19% VAT leaves $2.51 |
| Polar                      | About 5% + 50¢, plus about 1.5% for non-US cards: roughly $0.65–0.70 (**confirm** on Polar's fee page)                         |
| Rendering, year pack       | About 2.4¢ (measured, see Render test)                                                                                         |
| Rendering, month pack      | About 1.1¢                                                                                                                     |
| With all 3 updates used    | Up to about 9.4¢ (year) or 4.4¢ (month)                                                                                        |
| Blob storage and downloads | Under 1¢ (5.1 MB per year pack)                                                                                                |
| **Left per sale**          | **About $1.85 from an EU buyer, about $2.30 from a US buyer**                                                                  |

Fixed per month once selling: Vercel Pro $20 (Hobby forbids commercial use), Neon Launch about $15, Resend Pro $20 if the waitlist and sign-ins need it, and about $0.06 per kept snapshot. About $55 a month, covered by roughly 30 sales.

## Before the first sale

1. Polar account approved, paying out to an individual in Romania (**confirm**).
2. `/videos`, `/terms` and `/privacy` updated, and the credits line added.
3. Vercel Pro, Neon Launch, and Resend Pro or a batched launch email.
4. A test purchase, a free claim, an update and a refund on production, on an iPhone inside Instagram's in-app browser as well as in Safari and Chrome.

## Build order

| When                   | What                                                                                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 16–20 November         | Done: `/videos` with the price and refund terms (PR #68), flag images everywhere (PR #69), the Sandbox render test. Apply to Polar                                          |
| 23–27 November         | Accounts launch (23rd). `video_order`, `video_render`, `video_credit`. Remotion entry and server bundle. The Workflow pipeline with Blob uploads and the "ready" email      |
| 30 November–4 December | Checkout and progress in the export dialog, `/account` videos and updates, admin orders, privacy and record of processing, paid plans, credits import, launch email. Launch |

The 1 December year-end reminder email goes out in the same week. It can't mention the videos: `/privacy` promises that email is never used for marketing, so the launch goes to the video waitlist instead.

## Alternatives considered

- **Stripe Managed Payments.** Cheaper on small sales (3.5% on top of Stripe's normal fees), but access depends on a review and Romania wasn't confirmed as a supported country.
- **Paddle.** Same fees as Polar, but the strictest and slowest approval, which risks early December.
- **Lemon Squeezy.** Being folded into Stripe.
- **Remotion Lambda.** Mature and the cheapest per render (about 1–2¢ a pack), can run in Frankfurt, and has its own completion webhook. Needs an AWS account, permissions and a raised concurrency quota. Not needed: Sandbox made a year pack in about 16 s for about 2.4¢, with no failures in 46 renders.
- **Rendering in the browser** (`renderMediaOnWeb`). No server cost, but needs Safari 26 or later, may not work in in-app browsers, and stops when the tab goes to the background. A paid video that won't render on the buyer's phone means a refund.
- **pg-boss and a worker on a server.** A fixed $35–70 a month before any sale, keeps Neon awake all month, one machine renders one pack at a time, and it's a server to maintain.
- **A table and a per-minute cron.** Keeps Neon awake all month for the same reason.
- **Flags:** Apple (can't be used on a server), `flag-icons` (flat, and white flags such as Japan's disappear against white), Noto as it is (too bright and flat), Noto with shading (barely visible at year size, needs masks), Twemoji (flat, needs a credit), circle-flags (doesn't look like emoji).
- **A basket.** One product per period; nothing to combine.
- **An end date for updates.** The 80% rule and the cap already stop videos for friends; a date would only stop people updating their own year.

## Open questions

- **Credit expiry.** Proposed 31 January 2027: it gives the launch email a deadline, and unclaimed emails are then deleted from Postgres, in line with deleting the waitlist 12 months after launch.
- **Launch date** within the first week of December, and whether the 1 December reminder mentions videos.
- **Consent at checkout.** Settled: both products carry a required checkbox, `delivery_consent`, asking for immediate delivery and accepting that the right to cancel ends.
- **Remotion licence.** Free for individuals and companies of up to 3 people; recheck if that changes.
