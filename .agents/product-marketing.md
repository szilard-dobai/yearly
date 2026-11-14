# Product Marketing Context

**Document version:** v2
**Last updated:** 2026-11-14

## Product Overview

**One-liner:** Yearly turns the countries you visited this year into a shareable calendar, with a flag on every day you were away.

**What it does:** You pick a country and the dates you were there. Flags replace those days on a 12-month calendar. You export JPEGs to post: the full year, a single month (1080×1920, story-sized), and a statistics card (countries, days away, longest trip, busiest month).

**Product category:** Travel year-in-review / travel calendar maker. People search for it as "yearly world", "my year in travel", "travel year", "calendar travel".

**Product type:** Free web app (Next.js PWA). No install. Accounts are optional and free (launching December 2026): people sign in with an emailed code or Google to save their calendar and see it on any phone or computer.

**Business model:** Free. The images are free and stay free. A paid animated video version is being tested as a fake door ($1.99 vs $2.99 split, email waitlist); nothing is for sale yet. Public copy may say an optional paid animated version is being tested.

## Target Audience

**Target users:** People who traveled to a few countries this year and want to post a recap. The biggest observed group is young, mobile-first users in Singapore and Southeast Asia (Malaysia, Philippines, Indonesia), plus the US and UK.

**Primary use case:** Make a good-looking year-in-review of your travel to post on Instagram or TikTok.

**Jobs to be done:**

- "Show the year I had" in one image people can read at a glance.
- Count it: how many countries, how many days away, which month was busiest.
- Make the thing I just saw someone else post ("what app is this?").

**Use cases:**

- End-of-year recap post (December–January).
- Monthly story after a trip-heavy month.
- Settling "how many days was I actually away?" with the stats card.
- Filling in last year after seeing someone else's (the previous year is selectable).

## Personas

B2C, single user. No buying committee.

| Persona                         | Cares about                                     | Challenge                                          | Value we promise                                            |
| ------------------------------- | ----------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------- |
| The viewer (arrives via a post) | Making the same thing they just saw, quickly    | Doesn't know the name; searches "what app is this" | Same look, made in minutes on their phone, free, no sign-up |
| The year-end poster             | A recap that looks good next to their friends'  | Photo dumps don't show where and how long          | A calendar of flags that says "my year" without a caption   |
| The frequent traveler           | The numbers: countries, days away, longest trip | Counting days across trips by hand                 | A stats card that adds it up                                |

## Problems & Pain Points

**Core problem:** A year of trips is hard to show in one post. Photo carousels show places but not how much of the year you spent away.

**Why alternatives fall short:**

- Map apps (countries-visited trackers) show where, not when, and need an install and often an account.
- GPS travel trackers need you to have tracked the trip as it happened.
- Design templates (Canva and similar) take time and you place every flag by hand.

**What it costs them:** Time, or a recap post that never happens.

**Emotional tension:** Wanting the year to look as good as it felt, and as good as the posts they've seen.

## Competitive Landscape

Checked against US search results on 2026-11-07.

**Direct:** Year-in-review features inside travel apps (Tripsy Recap, Polarsteps Unpacked, Venngage's Travel Wrapped) — fall short because they need the trips logged in that app, or an account, before they can recap anything.
**Secondary:** Countries-visited map apps on the App Store (Visited, Been, Atlas and many clones) — fall short because they show where, not when, and need an install.
**Indirect:** Video and design templates (CapCut "vacation recap", Canva year-in-review, Instagram's recap Reels) — fall short because they're manual and don't count anything.

## Differentiation

**Key differentiators:**

- Calendar view: when you traveled, not just where.
- Flags on the days themselves, so the image reads at a glance.
- Three export formats sized for posting.
- Works in the browser on a phone in minutes, with nothing to install and no account needed.
- Without an account, trips stay on your device (localStorage) and we never receive the dates. With a free account, they're saved to it and show up on every device where you sign in.

**How we do it differently:** You type in trips after the fact. There's no tracking to set up, and signing up is optional.

**Why that's better:** You can make last year's recap today, from memory or your photo roll.

**Why customers choose us:** They saw one, it looked good, and making their own takes a few minutes.

## Objections

| Objection                         | Response                                                                                                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Do I have to sign up?"           | No. An account is optional and free. It keeps your calendar safe and on every device.                                                                           |
| "What happens to my travel data?" | Without an account, your trips stay in your browser and we never receive the dates. If you sign in, we save them to your account so you can open them anywhere. |
| "Is it really free?"              | Yes. Making and downloading the images is free. We're testing an optional paid animated version.                                                                |
| "Will I lose my calendar?"        | Not if you sign in: a free account keeps it. Without one, it's saved in this browser, and clearing browser data deletes it.                                     |

**Anti-persona:** People planning a future trip (itinerary, bookings, holiday calendars). Yearly is for showing travel that already happened.

## Switching Dynamics

**Push:** Photo dumps don't say how much you traveled; templates are slow.
**Pull:** The look of someone else's export; "free, no sign-up".
**Habit:** Posting a carousel or using Instagram's own recap formats.
**Anxiety:** Sign-up walls, privacy of travel dates, whether it works on a phone.

## Customer Language

**How they describe the problem / search for us (Search Console, 16 months):**

- "what app is this?", "which calendar is this", "qual o app"
- "yearly world", "my year in travel", "travel year", "calendar travel"

**How they describe us:** No verbatim reviews collected yet. The feedback collection (star rating + message) is the place to pull them from.

**Words to use:** your year, travel, countries, flags, calendar, days, trips, share, free, no sign-up needed, free account, save your calendar, see it on any phone or computer.

**Words to avoid:** "trip planner", "itinerary", "holiday planner" (we don't plan), "tracker" for anything automatic (nothing tracks you), "stunning", "seamless", "wanderlust". In account copy, avoid "sync", "cloud" and "register"; say "save your calendar to a free account" and "sign in".

**Glossary:**

| Term         | Meaning                                                                                              |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| Yearly       | The product, and the calendar you make ("your Yearly")                                               |
| yearly.world | The domain, and the watermark on every export                                                        |
| Trip / visit | A country and a date range                                                                           |
| Export       | A downloaded JPEG: full year, single month or statistics                                             |
| Account      | Optional, free sign-in (emailed code or Google) that saves the calendar and shows it on every device |

## Brand Voice

| Attribute     | Means                                                    | Doesn't mean                   | Example line                                |
| ------------- | -------------------------------------------------------- | ------------------------------ | ------------------------------------------- |
| Plain         | Short words, concrete facts, one idea per sentence       | Flat or technical              | "We never receive the dates of your trips." |
| Quiet         | Lets the image do the selling; few adjectives            | Shy about saying what it is    | "Your year, at a glance."                   |
| Honest, small | Says what it does and doesn't do; an independent project | Self-deprecating or apologetic | "Yearly is a small, independent project."   |

**Tone by context:**

- Support: answer first, then the fix.
- Launch: what's new and who it's for, one specific.
- Errors: what happened, what to do.
- Sales: none; the product page and the export do the work.
- Social: the exports themselves, with a short caption.

**Terms we own:** Yearly, "your Yearly", "made with yearly.world".
**Spelling:** US English on the site ("traveled", "visualize"). The US is the biggest non-brand search market.
**Never use (and why):** "planner" (we don't plan trips), "stunning"/"beautiful" stacked in one line (the image proves it), any claim about automatic tracking (there is none).

## Proof Points

**Metrics:**

- Late-Oct 2026 Singapore burst: about 750 new devices, 93% mobile.
- Of homepage visitors in that burst: 73% clicked through to /create, 59% tried adding a trip, 46% downloaded an image.
- "yearly world": 308 clicks at 77.8% CTR, position 1.3 (Search Console, 16 months to 7 Nov 2026).

**Customers:** Consumers; no logos.
**Testimonials:** None collected yet.
**Value themes:**

| Theme                 | Proof                                                              |
| --------------------- | ------------------------------------------------------------------ |
| Fast to make          | 46% of burst visitors downloaded an image in their first visit     |
| Spreads by being seen | Brand search and "what app is this?" queries follow shared exports |
| Private               | Trips stored in localStorage; privacy page states it               |

## Goals

**Business goal:** Turn the export → watermark → search loop into lasting users before the December year-in-review peak, and test willingness to pay for animated videos.
**Conversion action:** Homepage → /create click (baseline 73%), then a downloaded image.
**Current metrics:** See Proof Points. Retention is weak: 78% of burst visitors never came back after day one.

## Learnings

_Decisions and tested lessons. Newest first. Keep it to about 20 active entries._

| Date       | Learning                                                                                                                   | Evidence                                                                                                                                          | Applies to                    | Status |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------ |
| 2026-11-14 | Accounts are optional: every account prompt says Yearly works without one, and "free, no sign-up needed" stays true        | Decision by the owner when adding accounts; sign-up walls are a listed anxiety (Switching Dynamics)                                               | Copywriting, CRO, FAQ, emails | active |
| 2026-11-07 | Lead non-brand SEO with "travel year in review" / "year in travel"; use "travel calendar" only as a descriptor             | US results for "travel calendar" and "calendar travel" are planning templates and wall calendars; "calendar travel" had 260 impressions, 0 clicks | SEO, copywriting              | watch  |
| 2026-11-07 | Homepage copy is about travel that already happened; don't mention planning even though next year is selectable            | Decision: planning searches are a different intent with entrenched competitors                                                                    | SEO, copywriting              | active |
| 2026-11-07 | Say the images are free and that an optional paid animated version is being tested; never imply the images will cost money | Decision: keeps "free" true while the $1.99/$2.99 fake door runs                                                                                  | Copywriting, FAQ, schema      | active |
| 2026-11-07 | Brand search from the watermark is the main channel; keep "Yearly" and "yearly.world" prominent and never rename           | "yearly world" 308 of 760 Search Console clicks; Oct burst came via brand search                                                                  | SEO, copywriting, exports     | active |

## Changelog

_Newest first. One line per revision: what changed and why._

- v2 (2026-11-14) — Added optional free accounts (emailed code or Google) to Product, Differentiation, Objections, Customer Language and Glossary; new Learning that account copy always says Yearly works without one.
- v1 (2026-11-07) — Initial context, drafted from the homepage SEO brief and the codebase.
