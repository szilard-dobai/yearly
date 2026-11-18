import { escapeHtml } from './html'
import { emailButton, emailHeading, emailHtml } from './layout'
import type { Email } from './send'

export const VIDEO_LAUNCH_SITE_URL = 'https://www.yearly.world'
export const VIDEO_LAUNCH_REPLY_TO = 'hello@yearly.world'

export function getVideoLaunchLink(siteUrl = VIDEO_LAUNCH_SITE_URL): string {
  const params = new URLSearchParams({
    utm_source: 'waitlist',
    utm_medium: 'email',
    utm_campaign: 'video_launch',
  })
  return `${siteUrl.replace(/\/+$/, '')}/create?${params}`
}

export function videoLaunchEmail(
  to: string,
  {
    freeUntil,
    unsubscribe,
  }: {
    freeUntil: string
    unsubscribe: { page: string; oneClick: string }
  }
): Email {
  const link = getVideoLaunchLink()
  const subject = 'Your free Yearly video is ready'
  const preview = `Sign in with this email by ${freeUntil} to make it.`
  const heading = 'Your free video is ready'
  const why =
    'You saved a free video when you joined the waitlist on yearly.world. Videos are ready, so you can make yours now.'
  const what =
    'Your free pack can be a whole year (a video of your year and one of your stats) or one month. Each video comes in dark and light.'
  const how = `Open Yearly on the phone or computer where you added your trips. Export an image, tap See it animated, then sign in with ${to}.`
  const deadline = `You can make it until ${freeUntil}.`
  const button = 'Make my free video'
  const footer =
    "You're getting this one email because you joined the video waitlist on yearly.world."
  const unsubscribeLabel = 'Unsubscribe'

  return {
    to,
    subject,
    replyTo: VIDEO_LAUNCH_REPLY_TO,
    headers: {
      'List-Unsubscribe': `<${unsubscribe.oneClick}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
    text: [
      heading,
      '',
      why,
      '',
      what,
      '',
      how,
      '',
      deadline,
      '',
      `${button}:`,
      link,
      '',
      footer,
      `${unsubscribeLabel}: ${unsubscribe.page}`,
    ].join('\n'),
    html: emailHtml({
      title: subject,
      preview,
      body: `${emailHeading(heading)}
                <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">${escapeHtml(why)}</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">${escapeHtml(what)}</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">${escapeHtml(how)}</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.5;">${escapeHtml(deadline)}</p>
                ${emailButton(link, button)}
                <p class="muted rule" style="margin:0;padding-top:16px;border-top:1px solid #e4e4e7;font-size:13px;line-height:1.5;color:#71717a;">${escapeHtml(footer)} <a class="muted" href="${escapeHtml(unsubscribe.page)}" style="color:#71717a;">${escapeHtml(unsubscribeLabel)}</a></p>`,
    }),
  }
}
