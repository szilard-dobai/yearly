# Data breach runbook

What to do if personal data is leaked, lost, changed or locked away, whether by an attack, a mistake or a vendor's incident. Last updated 14 November 2026. Where the data lives is in [05-record-of-processing.md](05-record-of-processing.md).

**The clock:** ANSPDCP must hear within 72 hours of the moment you're reasonably sure a breach touched personal data (GDPR Art. 33). Partial information is fine; add the rest later.

## How you might find out

- A security email from Vercel, MongoDB, Neon, Resend, Sentry, Slack, ImprovMX, Google or GitHub
- A secret committed to the repo or pasted somewhere public
- Odd admin activity, unexpected data in Slack, or a spike of Sentry errors
- Someone writes to hello@yearly.world

## 1. Contain (first hour)

1. **Save evidence before changing anything.** Export the relevant Vercel, Sentry and database logs. Vercel keeps runtime logs only briefly on Hobby, so do this first.
2. **Rotate whatever might be exposed**, in Vercel environment variables, then redeploy:

| Secret                                                   | Where to rotate                   | Side effect                            |
| -------------------------------------------------------- | --------------------------------- | -------------------------------------- |
| `MONGODB_URI`                                            | Atlas: new database user password | None                                   |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED`                  | Neon: reset role password         | None                                   |
| `BETTER_AUTH_SECRET`                                     | Generate a new one                | Signs everyone out                     |
| `GOOGLE_CLIENT_SECRET`                                   | Google Cloud console              | Google sign-in breaks until redeployed |
| `RESEND_API_KEY`                                         | Resend                            | None                                   |
| `ADMIN_PASSWORD`                                         | Choose a new one                  | Signs admin out                        |
| `CRON_SECRET`                                            | Generate a new one                | None                                   |
| `SLACK_FEEDBACK_WEBHOOK_URL`, `SLACK_ALERTS_WEBHOOK_URL` | Slack app settings                | Recreate the webhooks                  |
| `SENTRY_AUTH_TOKEN`, `SENTRY_READ_TOKEN`                 | Sentry and GitHub secrets         | None                                   |

3. **If accounts may be taken over:** delete every row in the Neon `session` table to sign everyone out.
4. **Stop the leak** at its source: revert the deploy, close the endpoint or remove the public file.

## 2. Assess (same day)

Write down what data, whose, roughly how many people and records, whether it was readable (hashed values aren't), and what could happen to those people.

| What leaked                                                | Likely risk to people                                 | Tell ANSPDCP?                          | Tell the people?                          |
| ---------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------- | ----------------------------------------- |
| Usage events (random IDs, regions, country and day counts) | Unlikely                                              | No, log it                             | No                                        |
| Hashed IPs or hashed sign-in codes                         | Unlikely                                              | No, log it                             | No                                        |
| Feedback messages                                          | Depends on what people wrote                          | Yes, if messages hold personal details | Rarely                                    |
| Waitlist or reminder emails                                | Spam or phishing                                      | Yes                                    | Usually not; consider it for a large leak |
| Account emails with saved trips                            | High: trip dates show when someone was away from home | Yes                                    | Yes                                       |
| Session tokens or sign-in access                           | Account takeover                                      | Yes                                    | Yes, after signing everyone out           |

The test is risk to people's rights and freedoms (notify ANSPDCP) and high risk (also tell the people, GDPR Art. 34). When unsure, notify.

## 3. Notify (within 72 hours)

**ANSPDCP (Romania, lead authority).** Use the breach notification form on [dataprotection.ro](https://www.dataprotection.ro) and follow the submission instructions there. Older guidance says to send it electronically signed by email, so check the current address before sending. Include:

- what happened and when you found out
- categories and rough numbers of people and records
- likely consequences
- what you've done and will do
- contact: Szilard Dobai, hello@yearly.world
- if past 72 hours, why it's late

**ICO (UK).** If UK users are affected, also report to the ICO. Check first whether that applies to a controller based outside the UK.

**The people affected.** Email them through Resend in plain words. The free plan sends 100 emails a day, so upgrade for a larger send. If emailing everyone isn't possible, post a notice on yearly.world instead.

> Subject: Something went wrong with your Yearly data
>
> On [date] we found that [what happened]. It affected [what data, e.g. your email address and saved trips]. Your [what wasn't affected] wasn't affected.
>
> We've [what you did, e.g. fixed the cause and signed everyone out]. [What they should do, e.g. be careful with emails claiming to be from Yearly.]
>
> We're sorry. If you have questions, reply to this email.
>
> Szilard, Yearly

## 4. Record (always)

Log every breach, even ones you don't report (GDPR Art. 33(5)): date found, what happened, data and people affected, likely effects, what you did, and whether you notified and why. Keep the log somewhere private, **not in this repo**, which is public.

## 5. Review (within two weeks)

Fix the root cause, add a test that would have caught it, and update the privacy page and the record of processing if anything about how Yearly handles data changed.
