# User Feedback Design

## Problem

Traffic has jumped and we have no direct channel to hear from users. Tracking events tell us _what_ people do, but not _why_ or what they wish the app did. We need a low-friction way to collect ratings and suggestions, and a way to review them next to the tracking events from the same device.

## Goals

- Collect a 1–5 star rating and/or free-text feedback from users of `/create`
- Ask at the moment of success (after an image is downloaded) without nagging
- Always offer a way to send feedback unprompted
- Store feedback in MongoDB, keyed by the same `deviceId` used by tracking
- Give admins a page to browse, sort, and filter feedback, and to inspect the tracking timeline of the device that sent it

## Non-goals

- Replies to users, accounts, or email collection
- Feedback categories/tags (kept out to keep the form simple; can be added later as an optional field)
- Moderation workflow (read/archived states)

## Rating scale

1–5 stars instead of thumbs up/down. It is still a single tap, but yields an average and a distribution, and lets the admin page sort by rating value. A rating is optional when a message is provided.

## User-facing UI

### 1. Post-download prompt (inline in `ImagePreviewModal`)

After the user taps **Download Image**, a compact card animates in below the button:

1. **Rate** — "Enjoying Yearly?" with five stars and a dismiss (×) button
2. Tapping a star **immediately saves the rating** (so it is captured even if the modal is closed next), then the card asks a follow-up: "What could we do better?" (≤ 3★) or "Anything we could add or improve?" (≥ 4★), with a textarea, **Send**, and **Skip**
3. **Send** attaches the message to the same feedback document; the card switches to a thank-you state

It lives inside the modal because that is where the user's attention is at the moment of success, and it does not compete with the primary Download action since it only appears after it.

**Frequency capping** (localStorage, key `yearly_feedback_prompt`):

| Last event                   | Cooldown before prompting again |
| ---------------------------- | ------------------------------- |
| Submitted feedback (any way) | 90 days                         |
| Dismissed the prompt (×)     | 30 days                         |
| Prompt shown but ignored     | 3 days                          |

### 2. Always-available entry point

- **Desktop (`lg+`)**: a floating "Feedback" pill at the bottom-right of `/create`, inside the existing sticky bottom container so it never overlaps the footer
- **Mobile**: a "Send Feedback" action in the existing `MobileFab` menu (avoids a second floating button)

Both open `FeedbackDialog`: optional star rating, a textarea (max 2,000 characters, with counter), and **Send feedback**. Submit is enabled once there is a rating or a non-empty message. On success the dialog shows a thank-you state.

## Data model

New collection: `feedback`

```ts
{
  _id: ObjectId
  deviceId: string              // same id as tracking_events.deviceId
  rating: 1 | 2 | 3 | 4 | 5 | null
  message: string | null        // trimmed, ≤ 2000 chars
  source: 'post_export' | 'feedback_button' | 'mobile_fab'
  context: {
    exportType?: 'calendar' | 'statistics' | 'monthly'
    year?: number
  }
  deviceType?: 'mobile' | 'tablet' | 'desktop'
  userAgent?: string
  country?: string              // x-vercel-ip-country
  region?: string               // x-vercel-ip-country-region
  createdAt: Date
  updatedAt: Date
}
```

Indexes (created once per server process, idempotent): `{ createdAt: -1 }`, `{ rating: 1, createdAt: -1 }`, `{ deviceId: 1, createdAt: -1 }`.

Recommended manual index for the device timeline lookup on the existing large collection: `db.tracking_events.createIndex({ deviceId: 1, timestamp: -1 })`. It is not created from app code to avoid an unplanned index build on production data.

### New tracking events

`feedback_prompt_shown`, `feedback_prompt_dismissed`, `feedback_dialog_open`, `feedback_submitted`. These give a prompt response rate and put feedback moments on the device timeline.

## API

| Route                         | Auth        | Purpose                                                                                                                             |
| ----------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/feedback`          | same-origin | Create feedback. Zod-validated; requires rating or message; ≤ 10 submissions per device per hour (429); body ≤ 16 KB (413)          |
| `PATCH /api/feedback/[id]`    | same-origin | Add/replace the message (and optionally rating) on feedback created by the same `deviceId` within the last hour                     |
| `GET /api/feedback`           | admin       | List with `rating` (`1`–`5`, `none`), `source`, `hasMessage`, `search`, `sortField` (`createdAt`/`rating`), `sortOrder`, paging     |
| `GET /api/feedback/stats`     | admin       | Total, average rating, rating distribution, with-message count, last-7-days count                                                   |
| `GET /api/admin/devices/[id]` | admin       | Device summary (first/last seen, event count, locations), its tracking events (exact `deviceId` match, paged), and all its feedback |
| `GET /api/admin/auth`         | same-origin | Returns `{ authenticated }` so admin pages can check the session without running an analytics query                                 |

All admin routes reuse `validateSameOrigin` + `isAuthenticated` (the `admin_session` cookie set by the existing password login).

## Admin page: `/admin/feedback`

- Same password gate as `/admin/analytics` (shared `useAdminAuth` hook + `AdminLoginForm`), plus an Analytics / Feedback nav
- Summary cards: total, average rating, with comments, last 7 days, and a rating distribution bar
- Filters: rating (all, 5★…1★, no rating), source, "with comments only", message search
- Sort: newest first (default), oldest first, highest rating, lowest rating
- Feedback list with infinite scroll; each item shows stars, message, source, device type, location, time, and short device id
- Clicking an item opens a detail dialog with the full feedback and a **device activity** timeline: the device's tracking events with the feedback moments interleaved, other feedback from the same device, and an "Open in Analytics" link (`/admin/analytics?deviceId=…`, which now pre-fills the device filter)

## Testing

- Unit: Zod schemas, prompt cooldown logic, regex escaping
- Components: `StarRating`, `FeedbackDialog`, `FeedbackPrompt` (fetch mocked)
- Route: `POST /api/feedback` validation, same-origin, rate limit (Mongo mocked)
