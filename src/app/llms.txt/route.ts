import { isAccountsEnabled } from '@/lib/auth/enabled'
import { getFaqs } from '@/lib/faq'

export const dynamic = 'force-static'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL!

const NO_ACCOUNT_STORAGE =
  "Yearly runs in the browser on phones and computers, with no account and nothing to install. Trips are saved in the browser's local storage on the user's device. Yearly never receives travel dates, and images are created in the browser. Usage analytics record which countries are added and how many days, without dates."

const OPTIONAL_ACCOUNT_STORAGE =
  "Yearly runs in the browser on phones and computers, with nothing to install. An account is optional. Without one, trips are saved in the browser's local storage on the user's device and Yearly never receives travel dates. With a free account, signed in by email code or Google, the calendar is also saved to the account and shows up on every device where the user signs in. Images are always created in the browser. Usage analytics record which countries are added and how many days, without dates."

export function GET() {
  const accountsEnabled = isAccountsEnabled()
  const body = `# Yearly

> Yearly (yearly.world) is a free web app that turns the countries you visited into a travel calendar. You add each country and the dates you were there, flags fill those days on a 12-month calendar, and you download your travel year in review as an image to share.

${accountsEnabled ? OPTIONAL_ACCOUNT_STORAGE : NO_ACCOUNT_STORAGE}

## What you can make

- Full-year calendar: all 12 months on a 3×4 grid, with a country flag on every day spent in that country (JPEG)
- Single month: a 9:16 image, the shape of an Instagram or TikTok story (JPEG)
- Statistics card: countries visited, days abroad, average trip length, busiest month, share of the year abroad and top countries (JPEG)

## How it works

1. Pick a country and choose a day or a date range, or select the first and last day of a trip on the calendar and then pick the country.
2. Add the rest of your trips. A day can hold two countries, shown as two flags split diagonally.
3. Download the full year, one month or your statistics as a JPEG. On most phones, the download button opens the share options.

## FAQ

${getFaqs(accountsEnabled)
  .map(({ question, answer }) => `### ${question}\n\n${answer}`)
  .join('\n\n')}

## Pages

- [Yearly](${siteUrl}/): what Yearly makes, how it works and answers to common questions
- [Make your travel calendar](${siteUrl}/create): the app itself
- [Privacy](${siteUrl}/privacy): what Yearly stores, what it sends to its servers and how to delete it

## Optional

- [Instagram @yearly.world](https://www.instagram.com/yearly.world): examples and contact
`

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
