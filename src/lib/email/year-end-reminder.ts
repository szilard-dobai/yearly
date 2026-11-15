import { getReminderLink } from '@/lib/reminders/calendar'
import { REMINDER_DATE_LABEL } from '@/lib/reminders/date'
import type { Email } from './send'

export const REMINDER_EMAIL_SITE_URL = 'https://www.yearly.world'
export const REMINDER_REPLY_TO = 'hello@yearly.world'

const dateLabel = REMINDER_DATE_LABEL.replace(/ /g, ' ')

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function yearEndReminderEmail(
  to: string,
  year: number,
  { accountsEnabled }: { accountsEnabled: boolean }
): Email {
  const link = getReminderLink(year, REMINDER_EMAIL_SITE_URL, 'email')
  const subject = `Your ${dateLabel} reminder to share your ${year} Yearly`
  const preview = `Add your latest trips on the phone or computer where you made it, then download your images.`
  const heading = `Time for your ${year} Yearly`
  const why = `You asked us on yearly.world to remind you on ${REMINDER_DATE_LABEL}, when year-in-review season starts. Here's your reminder.`
  const action = `Add any trips you've taken since, then download your images and share your ${year}.`
  const button = 'Open my Yearly'
  const device = [
    'Your trips are saved in the browser where you added them, so open the link on that phone or computer.',
    accountsEnabled &&
      "If you sign in there, they'll also show up anywhere else you sign in.",
  ]
    .filter(Boolean)
    .join(' ')
  const onlyEmail = "This is the only reminder email we'll send."
  const deletion = `We'll delete your address at the end of ${year}. To have it deleted sooner, reply to this email or write to`

  return {
    to,
    subject,
    replyTo: REMINDER_REPLY_TO,
    text: [
      heading,
      '',
      why,
      '',
      action,
      '',
      `${button}:`,
      link,
      '',
      device,
      '',
      `${onlyEmail} ${deletion} ${REMINDER_REPLY_TO}.`,
    ].join('\n'),
    html: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${escapeHtml(subject)}</title>
    <style>
      @media (prefers-color-scheme: dark) {
        .page { background: #0a0a0a !important; }
        .card { background: #141414 !important; }
        .text { color: #f4f4f5 !important; }
        .muted { color: #a1a1aa !important; }
        .rule { border-color: #27272a !important; }
        .button { background: #f4f4f5 !important; }
        .button a { color: #18181b !important; }
      }
    </style>
  </head>
  <body class="page" style="margin:0;padding:32px 16px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#18181b;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;padding:32px;">
            <tr>
              <td class="text" style="color:#18181b;">
                <p style="margin:0 0 24px;font-size:20px;font-weight:600;">Yearly</p>
                <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;font-weight:600;">${escapeHtml(heading)}</h1>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">${escapeHtml(why).replace('year-in-review', '<span style="white-space:nowrap;">year-in-review</span>')}</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.5;">${escapeHtml(action)}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td class="button" style="border-radius:8px;background:#18181b;">
                      <a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 24px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(button)}</a>
                    </td>
                  </tr>
                </table>
                <p class="muted" style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#52525b;">${escapeHtml(device)}</p>
                <p class="muted rule" style="margin:0;padding-top:16px;border-top:1px solid #e4e4e7;font-size:13px;line-height:1.5;color:#71717a;">${escapeHtml(onlyEmail)} ${escapeHtml(deletion)} <a class="muted" href="mailto:${REMINDER_REPLY_TO}" style="color:#71717a;">${REMINDER_REPLY_TO}</a>.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  }
}
