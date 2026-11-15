import type { Email } from './send'

export function videosReadyEmail(
  to: string,
  { accountUrl, updated }: { accountUrl: string; updated: boolean }
): Email {
  const subject = updated
    ? 'Your updated Yearly videos are ready'
    : 'Your Yearly videos are ready'
  const lead = updated
    ? 'Your videos now include your latest trips.'
    : 'Your videos are ready to watch and save.'
  return {
    to,
    subject,
    text: [
      lead,
      '',
      `Watch and save them on your account: ${accountUrl}`,
      '',
      "They stay there, so you can save them again whenever you like. If something doesn't look right, reply to this email.",
    ].join('\n'),
    html: `<!doctype html>
<html>
  <body style="margin:0;padding:32px 16px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#18181b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;padding:32px;">
            <tr>
              <td>
                <p style="margin:0 0 24px;font-size:20px;font-weight:600;">Yearly</p>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.5;">${lead}</p>
                <p style="margin:0 0 24px;"><a href="${accountUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;font-size:16px;font-weight:600;padding:12px 20px;border-radius:10px;">Watch your videos</a></p>
                <p style="margin:0;font-size:14px;line-height:1.5;color:#52525b;">They stay on your account, so you can save them again whenever you like. If something doesn&#39;t look right, reply to this email.</p>
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
