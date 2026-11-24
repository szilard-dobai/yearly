import { getReminderLink } from '@/lib/reminders/calendar'
import { REMINDER_DATE_LABEL } from '@/lib/reminders/date'
import { escapeHtml } from './html'
import { emailButton, emailHeading, emailHtml } from './layout'
import type { Email } from './send'

export const REMINDER_EMAIL_SITE_URL = 'https://www.yearly.world'
export const REMINDER_REPLY_TO = 'hello@yearly.world'

const dateLabel = REMINDER_DATE_LABEL.replace(/ /g, ' ')

export function yearEndReminderEmail(to: string, year: number): Email {
  const link = getReminderLink(year, REMINDER_EMAIL_SITE_URL, 'email')
  const subject = `Your ${dateLabel} reminder to share your ${year} Yearly`
  const preview = `Add your latest trips on the phone or computer where you made it, then download your images.`
  const heading = `Time for your ${year} Yearly`
  const why = `You asked us on yearly.world to remind you on ${REMINDER_DATE_LABEL}, when year-in-review season starts. Here's your reminder.`
  const action = `Add any trips you've taken since, then download your images and share your ${year}.`
  const button = 'Open my Yearly'
  const device =
    "Your trips are saved in the browser where you added them, so open the link on that phone or computer. If you sign in there, they'll also show up anywhere else you sign in."
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
    html: emailHtml({
      title: subject,
      preview,
      body: `${emailHeading(heading)}
                <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">${escapeHtml(why).replace('year-in-review', '<span style="white-space:nowrap;">year-in-review</span>')}</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.5;">${escapeHtml(action)}</p>
                ${emailButton(link, button)}
                <p class="muted" style="margin:0 0 24px;font-size:14px;line-height:1.5;color:#52525b;">${escapeHtml(device)}</p>
                <p class="muted rule" style="margin:0;padding-top:16px;border-top:1px solid #e4e4e7;font-size:13px;line-height:1.5;color:#71717a;">${escapeHtml(onlyEmail)} ${escapeHtml(deletion)} <a class="muted" href="mailto:${REMINDER_REPLY_TO}" style="color:#71717a;">${REMINDER_REPLY_TO}</a>.</p>`,
    }),
  }
}
