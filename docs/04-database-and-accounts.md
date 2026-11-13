# Decision: Postgres on Neon and optional accounts with Better Auth

- **Status:** Accepted
- **Date:** 13 November 2026
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
| Email    | **Resend**                                                  | Sign-in links, the 1 December reminder, purchase receipts.                                                                                                                                    |
| Payments | A merchant of record (Polar or Paddle), decided in phase 2  | Handles UK, EU and US sales tax for us. Both charge 5% + 50¢ on their starter plans.                                                                                                          |

Sign-in methods: an emailed sign-in link and Google. No passwords.

### Product rules

1. **Accounts stay optional.** Making a calendar and exporting images never needs an account, so "free, no sign-up" stays true. People sign in only to buy or claim a video, and later to sync.
2. **Trips stay on the device** until cross-device sync is built and offered as an opt-in. Storing travel history on our servers needs a privacy page update first.
3. **No IP addresses at rest.** Better Auth's session IP is dropped before saving, and rate-limit keys are hashed. This keeps the privacy page's promise.
4. The privacy page changes in the same PR that first shows sign-in to visitors.

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

| Phase | When                     | What                                                                                                                                                                                                                                                  |
| ----- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | 13–27 November 2026      | Neon, Drizzle and Better Auth for new data only: users, sessions, sign-in by email link and Google. Migrations run on each Vercel build. MongoDB is unchanged. Then: purchases and entitlements, and claiming the free first video by waitlist email. |
| 2     | Early December 2026      | Video checkout through the merchant of record. Vercel Pro. Sign-in shown to visitors at the point of buying. Privacy page update.                                                                                                                     |
| 3     | January 2027, after peak | Move tracking events, feedback, waitlist and reminders to Postgres and rewrite the analytics queries in SQL. Turn MongoDB off. Move the admin pages onto Better Auth. Offer cross-device sync as an opt-in.                                           |

## Consequences

- Two databases run side by side until phase 3.
- Migrations run before the new deployment goes live, so each schema change must work with the code already running. Add columns and tables first, remove old ones in a later deploy.
- Every Vercel build runs migrations, so the Neon integration must create a database branch for each preview deployment. Without that, a preview build would migrate the production database.
- Better Auth has shipped breaking changes in patch releases, so its version is pinned exactly and upgraded on purpose.
- Google sign-in doesn't work on preview URLs, because Google doesn't allow wildcard redirect addresses. Emailed links work everywhere.

## Revisit when

- Neon compute passes 70 hours in a month, or storage passes 700 MB.
- Resend sends more than 80 emails on any day.
- Monthly active users pass 50,000.
- A Better Auth upgrade breaks something we rely on.
