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
| Payments  | **Polar**, as merchant of record                                                | Handles sales tax and VAT. Accepts individuals, fast approval, an official Better Auth plugin, checkout that opens over the page                                                                                        |
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
- Signing in with a matching email shows "Your first video is free" and skips checkout. The credit is used when the first render starts.
- A credit can't be claimed by someone else, because signing in needs the code sent to that inbox.
- Free packs follow the same update rules as paid ones.
- The launch email goes to the whole waitlist through Resend. The free plan allows 100 emails a day, shared with sign-in codes, so either send in batches or move to Resend Pro first.

## The journey

1. A visitor finds Yearly through the homepage teaser, `/videos` or Instagram, and makes a calendar on `/create` without an account.
2. In the export preview, **See it animated** opens the video dialog: the watermarked preview, year or stats, dark or light.
3. **Get my videos – $2.99.** Signed-out people sign in inside the dialog, with an email code or Google.
4. The first-sign-in sync dialog ("This device has trips that aren't in your account") can appear here. It must finish before checkout, and the purchase picks up the merged calendar.
5. With a credit: "Your first video is free", then straight to step 7.
6. Without one: the dialog saves a draft order with the video data it previewed, then opens Polar's checkout over the page, with the account email filled in and the EU consent to immediate delivery of digital content.
7. Polar's `order.paid` webhook marks the order paid and starts the Workflow run. The browser's return from checkout is never trusted for this.
8. The dialog shows "Making your videos, about 1–2 minutes" and checks the status every few seconds. An email says when they're ready, so people in an in-app browser can close it.
9. The videos play without the watermark. **Save video** opens the share sheet on phones (Save to Photos) and downloads on desktop.
10. Later, on `/account`: download again, or **Update with my latest trips** (with the number of updates left).

Polar sends the receipt. We send the "ready" email, which links to `/account`.

## Rendering

### Pipeline

1. **Draft order.** Before checkout, `POST /api/videos/orders` stores the video data the dialog previewed (`YearVideoData` or `MonthVideoData`, both themes, week start), validated with Zod: the right period, real country codes, size limits. Rendering what was previewed means people get exactly what they saw.
2. **Payment.** Polar's checkout carries the draft order ID as metadata. The webhook, verified by signature and safe to receive twice, marks the order paid.
3. **Workflow run**, one per version (the first render or an update):
   1. Create a sandbox for each video and start the renders in parallel, detached.
   2. Check progress with durable sleeps, which use no compute and don't touch the database.
   3. Upload the MP4s to Blob.
   4. Mark the render ready in Postgres and send the email.
   5. Retry failed steps. After the last retry: mark it failed, alert Sentry and Slack, and refund from Polar if it can't be fixed the same day. The buyer sees "We're on it, we'll email you", never an error message.
4. **Updates** post new video data to the pack. The server checks the 80% rule and the update count, then starts a new run.

Neon is touched when the order is created, when it's paid, when the render is ready, and while the buyer's dialog checks the status. There is no per-minute cron and no job queue checking Postgres: each check keeps Neon awake for 5 minutes, so a per-minute cron would use all ~730 hours of a month, against 100 on the free plan.

The daily `/api/cron/retention` job also deletes unpaid draft orders older than a day, and alerts Slack about any render stuck for over an hour.

### Video code

- A Remotion entry registers `YearFillVideo`, `StatsVideo` and `MonthVideo` without `PreviewWatermark`. The preview and the server use the same compositions.
- The bundle is built with each deployment, so a render uses the same code as the preview people saw.
- Geist and Newsreader are bundled as font files; the `next/font` CSS variables don't exist outside the app.
- Pin `@remotion/vercel` exactly. Remotion marks it experimental.

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
| `video_credit` | Email, source (`waitlist`), the order that claimed it, expiry                                                                                                                    |

- Deleting an account deletes its orders, renders and their Blob files. Blob files aren't removed by the database cascade, so account deletion has to delete them explicitly.
- Polar is the seller and keeps the tax records, so our rows don't need to outlive the account.
- Collecting purchases and storing trip data with them means updating `/privacy` and `docs/05-record-of-processing.md` in the same PR, with Polar as an independent controller and Vercel Sandbox, Workflow and Blob as processors. Check which regions Sandbox offers and prefer an EU one.

## Pages

| Page                         | What changes                                                                                                                                                         |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/videos` (new, indexed)     | What the videos are, example videos from the homepage example trips, the price, what's included, updates, refunds. Polar checks for this page before approving us    |
| Export dialog                | Buy button with the real price, sign-in step, free credit, checkout, progress, the finished videos. Remove "One-time payment, no account needed" and the price split |
| `/account`                   | **Your videos**: one card per pack with each file to download and **Update with my latest trips (N left)**                                                           |
| `/terms`                     | Purchases, refunds (a refund if a video fails or comes out wrong; otherwise the EU right to cancel ends with the consent at checkout), seller details                |
| `/privacy`                   | Purchases, the trip data kept with them, Polar, Sandbox, Workflow and Blob                                                                                           |
| Credits (footer or `/terms`) | Noto Emoji, Apache License 2.0, colours adjusted                                                                                                                     |
| `/admin`                     | Orders: status, render errors, run a render again, link to the Polar order for refunds                                                                               |

User-facing copy is written with the `copywriting` and `cro` skills against `.agents/product-marketing.md`.

## Costs

Per sale, at $2.99:

| Item                       | Cost                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| Polar                      | About 5% + 50¢, plus about 1.5% for non-US cards: roughly $0.65–0.70 (**confirm** on Polar's fee page) |
| Rendering, year pack       | About 3–4¢ (4 videos, ~1,600 frames, assuming ~3 minutes on 4 CPUs; **measure** in the spike)          |
| Rendering, month pack      | About 2¢                                                                                               |
| With all 3 updates used    | Up to about 15¢                                                                                        |
| Blob storage and downloads | Under 1¢                                                                                               |

Fixed per month once selling: Vercel Pro $20 (Hobby forbids commercial use), Neon Launch about $15, Resend Pro $20 if the waitlist and sign-ins need it. About $55 a month, covered by roughly 25 sales.

## Before the first sale

1. Polar account approved, paying out to an individual in Romania (**confirm**).
2. `/videos`, `/terms` and `/privacy` updated, and the credits line added.
3. Vercel Pro, Neon Launch, and Resend Pro or a batched launch email.
4. A test purchase, a free claim, an update and a refund on production, on an iPhone inside Instagram's in-app browser as well as in Safari and Chrome.

## Build order

| When                   | What                                                                                                                                                                        |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 16–20 November         | `/videos` and the purchase terms, then apply to Polar. One-day spike: render the three videos in a Vercel Sandbox and measure time, start-up and cost. Flag image script    |
| 23–27 November         | Accounts launch (23rd). `video_order`, `video_render`, `video_credit`. Remotion entry and server bundle. The Workflow pipeline with Blob uploads and the "ready" email      |
| 30 November–4 December | Checkout and progress in the export dialog, `/account` videos and updates, admin orders, privacy and record of processing, paid plans, credits import, launch email. Launch |

The 1 December year-end reminder email goes out in the same week, so it can mention the videos if they're live by then.

## Alternatives considered

- **Stripe Managed Payments.** Cheaper on small sales (3.5% on top of Stripe's normal fees), but access depends on a review and Romania wasn't confirmed as a supported country.
- **Paddle.** Same fees as Polar, but the strictest and slowest approval, which risks early December.
- **Lemon Squeezy.** Being folded into Stripe.
- **Remotion Lambda.** Mature and the cheapest per render (about 1–2¢ a pack), can run in Frankfurt, and has its own completion webhook. Needs an AWS account, permissions and a raised concurrency quota. **The fallback if the Sandbox spike is slow or unreliable.**
- **Rendering in the browser** (`renderMediaOnWeb`). No server cost, but needs Safari 26 or later, may not work in in-app browsers, and stops when the tab goes to the background. A paid video that won't render on the buyer's phone means a refund.
- **pg-boss and a worker on a server.** A fixed $35–70 a month before any sale, keeps Neon awake all month, one machine renders one pack at a time, and it's a server to maintain.
- **A table and a per-minute cron.** Keeps Neon awake all month for the same reason.
- **Flags:** Apple (can't be used on a server), `flag-icons` (flat, and white flags such as Japan's disappear against white), Noto as it is (too bright and flat), Noto with shading (barely visible at year size, needs masks), Twemoji (flat, needs a credit), circle-flags (doesn't look like emoji).
- **A basket.** One product per period; nothing to combine.
- **An end date for updates.** The 80% rule and the cap already stop videos for friends; a date would only stop people updating their own year.

## Open questions

- **Credit expiry.** Proposed 31 January 2027: it gives the launch email a deadline, and unclaimed emails are then deleted from Postgres, in line with deleting the waitlist 12 months after launch.
- **Launch date** within the first week of December, and whether the 1 December reminder mentions videos.
- **Consent at checkout.** Confirm that Polar's checkout collects the EU consent to immediate delivery of digital content; otherwise ask for it in the dialog before checkout.
- **Remotion licence.** Free for individuals and companies of up to 3 people; recheck if that changes.
