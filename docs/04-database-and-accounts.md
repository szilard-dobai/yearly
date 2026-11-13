# Decision: Postgres on Neon and optional accounts with Better Auth

- **Status:** Accepted
- **Date:** 13 November 2026
- **Updated:** 14 November 2026, with sign-in, pages and flows
- **Owner:** Szilard

## Context

Yearly started as a tool that needs no server: trips live in the browser's local storage and every export is made in the browser. MongoDB (`tracking_events`, `feedback`, `waitlist`, `reminders`, `reminder_calendar_adds`) holds analytics and the email lists. The admin pages use a single password.

That no longer covers what's next:

- **Paid animated videos** launch in early December. A purchase has to belong to a person, so they can download it again and the waitlist's "first video free" can be honoured by email.
- **Prototyped features** (profile, home country, cross-device history, "how you rank") need data that outlives one browser.
- Purchases, users and entitlements are relational, and the analytics are already joins and group-bys written as Mongo pipelines.

Constraints: free to run until there is revenue, cheap paid plans once there is, providers that are well regarded, and staying close to Vercel and Next.js.

## Decision

| Layer    | Choice                                                      | Why                                                                                                                                                                                           |
| -------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database | **Neon Postgres**, connected through the Vercel Marketplace | Plain Postgres, which was the engine behind Vercel Postgres. A database branch for each preview deployment. Scales to zero. Paid plan has no monthly minimum.                                 |
| ORM      | **Drizzle**                                                 | Thin, close to SQL, typed schema in TypeScript, plain SQL migration files. Better Auth has a Drizzle adapter.                                                                                 |
| Auth     | **Better Auth**, running inside the app                     | MIT licence, no per-user cost. Users live in our own database, so purchases point at a user with a normal foreign key. Owned by Vercel since July 2026. Auth.js is in security-fix-only mode. |
| Email    | **Resend**                                                  | Sign-in codes, the 1 December reminder, purchase receipts.                                                                                                                                    |
| Payments | A merchant of record (Polar or Paddle), decided in phase 2  | Handles UK, EU and US sales tax for us. Both charge 5% + 50¢ on their starter plans.                                                                                                          |

Sign-in methods: a 6-digit code sent by email, and Google. No passwords.

We chose codes over emailed links. Trips live only in the browser that made them, and on phones a link from the mail app often opens in a different browser. The person would land signed in next to an empty calendar. A code is typed in the same tab. Google blocks its sign-in inside in-app browsers such as Instagram's and TikTok's, so the Google button is hidden there.

### Product rules

1. **Making and exporting never needs an account**, so "free, no sign-up" stays true. Anyone can create an account, not only buyers.
2. **Signing in saves your calendars to your account** (a later PR). Until that ships, trips stay on the device. The privacy page must describe it before accounts go live.
3. **Sign in before paying.** Claiming the waitlist's free first video needs a checked email, and downloading again needs an account.
4. **No IP addresses at rest.** Better Auth's session IP is dropped before saving, and rate-limit keys are hashed. This keeps the privacy page's promise.
5. **Accounts stay switched off in production until launch.** `ACCOUNTS_ENABLED=true` turns on `/sign-in`, `/account` and `/api/auth`; otherwise all three return 404. It is on for Preview and local development. The privacy page changes in the PR that turns it on in production.

## Pages and access

| URL                        | What it is                                                    | Signed out                           | Signed in                                           | Google  |
| -------------------------- | ------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------- | ------- |
| `/`                        | Homepage                                                      | Open                                 | Open                                                | Index   |
| `/create`                  | The app. Never asks for an account                            | Open                                 | Open                                                | Index   |
| `/videos` (to build)       | What the animated video is, examples and price                | Open                                 | Open                                                | Index   |
| `/privacy`, `/terms` (new) | Policies; the terms include refunds                           | Open                                 | Open                                                | Index   |
| `/sign-in`                 | Email code or Google. `?next=/path` returns you afterwards    | Form                                 | Redirect to `next`, or `/account`                   | Noindex |
| `/account`                 | Your videos (download again), email, sign out, delete account | Redirect to `/sign-in?next=/account` | Open                                                | Noindex |
| `/admin/*`                 | Analytics and feedback                                        | Password for now                     | 404 for everyone but the owner, once on Better Auth | Noindex |

Rules:

- **Personal pages redirect to sign-in and back.** Emails link to them.
- **Pages a visitor shouldn't know about return 404:** admin pages, someone else's video, and everything while accounts are switched off. Nothing returns 403.
- **`next` only accepts paths on this site**, and never `/sign-in` itself or `/api`, so it can't send people elsewhere or loop.
- **Payment providers check for public pricing, terms and a refund policy before approving us**, so `/videos` and `/terms` come before checkout.
- **A page per video can wait.** Downloads are listed on `/account`. If one is added later, it lives at `/account/videos/[id]` and returns 404 to anyone but the owner.

## Flows

1. **Make a calendar:** unchanged. Most people never see sign-in.
2. **Create an account:** from the header's "Sign in" link (after launch) or `/sign-in`, by email code or Google. Later, this saves the calendars to the account.
3. **Buy a video:** in the export dialog, "Get the video", then sign in inside the dialog, then pay in the provider's overlay without leaving the page, then the video renders and downloads. The receipt email links to `/account`.
4. **Claim the free first video:** the launch email links to `/create`. In the same dialog, people sign in with the waitlist email, and the payment step is skipped.
5. **Download again:** from the receipt email or the header's "Your videos" link, to `/account`.
6. **Delete account:** from `/account`. Required by UK GDPR from the day accounts are visible.

## Alternatives considered

- **Supabase** (Postgres + auth + storage). Well regarded and its free database doesn't count compute hours. Not chosen because it's a whole platform we would mostly not use, the free database is 500 MB, free projects pause after a week without activity, preview branches are a paid feature and the paid plan is a flat $25/month.
- **Clerk.** The best ready-made sign-in screens. Not chosen because users would live in Clerk and need syncing to our database through webhooks, passkeys and removing the Clerk branding need the $25/month plan, and Clerk Billing isn't a merchant of record.
- **Auth.js.** Security fixes only since September 2025; v5 never left beta.
- **Neon Auth** (managed Better Auth). The same library, hosted by Neon, free up to 60,000 monthly users. Running the library inside the app costs nothing either and keeps one less moving part outside our control. We can switch later without changing tables.
- **Prisma.** Fine, but heavier than we need. Drizzle is closer to the SQL the analytics will need.

## Free tiers and when they stop being enough

| Provider | Free                                                     | Paid                                         | Watch out for                                                                                                                                                                                  |
| -------- | -------------------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vercel   | Hobby                                                    | Pro, $20/month                               | **Hobby is for personal, non-commercial use only.** Upgrade before the first sale.                                                                                                             |
| Neon     | 1 GB per project, 100 compute-hours a month, 5 GB egress | Launch: pay as you go, about $15/month small | Each request keeps the database awake for 5 minutes. At the smallest size, 100 hours lasts about 400 of the month's ~730 hours. **Run out and the database is switched off until next month.** |
| Resend   | 3,000 emails a month, **100 a day**                      | Pro, $20/month for 50,000                    | Sign-in links and the 1 December reminder share the daily limit.                                                                                                                               |

Because of the Neon limit, page-view tracking stays in MongoDB through the December peak. Moving it to Postgres happens on the Launch plan.

Expected cost once selling: about $20–60 a month, covered by roughly 10–25 video sales.

## Rollout

| Phase | When                     | What                                                                                                                                                                                                                                                                                                              |
| ----- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | 13–27 November 2026      | Neon, Drizzle and Better Auth for new data only: users, sessions, sign-in by email code and Google, behind `ACCOUNTS_ENABLED`. Migrations run on each Vercel build. MongoDB is unchanged. Then: saving calendars to the account, purchases and entitlements, and claiming the free first video by waitlist email. |
| 2     | Early December 2026      | `/videos` and `/terms`. Video checkout through the merchant of record. Vercel Pro. Delete account. Privacy page update. Header sign-in links. `ACCOUNTS_ENABLED` turned on in production.                                                                                                                         |
| 3     | January 2027, after peak | Move tracking events, feedback, waitlist and reminders to Postgres and rewrite the analytics queries in SQL. Turn MongoDB off. Move the admin pages onto Better Auth. Offer cross-device sync as an opt-in.                                                                                                       |

## Consequences

- Two databases run side by side until phase 3.
- Migrations run before the new deployment goes live, so each schema change must work with the code already running. Add columns and tables first, remove old ones in a later deploy.
- Every Vercel build runs migrations, so the Neon integration must create a database branch for each preview deployment. Without that, a preview build would migrate the production database.
- Better Auth has shipped breaking changes in patch releases, so its version is pinned exactly and upgraded on purpose.
- Google sign-in doesn't work on preview URLs, because Google doesn't allow wildcard redirect addresses. Email codes work everywhere.

## Revisit when

- Neon compute passes 70 hours in a month, or storage passes 700 MB.
- Resend sends more than 80 emails on any day.
- Monthly active users pass 50,000.
- A Better Auth upgrade breaks something we rely on.
