import { escapeHtml } from './html'
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
                <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">${escapeHtml(why)}</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">${escapeHtml(what)}</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.5;">${escapeHtml(how)}</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.5;">${escapeHtml(deadline)}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td class="button" style="border-radius:8px;background:#18181b;">
                      <a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 24px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">${escapeHtml(button)}</a>
                    </td>
                  </tr>
                </table>
                <p class="muted rule" style="margin:0;padding-top:16px;border-top:1px solid #e4e4e7;font-size:13px;line-height:1.5;color:#71717a;">${escapeHtml(footer)} <a class="muted" href="${escapeHtml(unsubscribe.page)}" style="color:#71717a;">${escapeHtml(unsubscribeLabel)}</a></p>
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
