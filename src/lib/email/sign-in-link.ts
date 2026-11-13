import type { Email } from './send'

export const SIGN_IN_LINK_MINUTES = 15

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function signInLinkEmail(to: string, url: string): Email {
  const href = escapeHtml(url)
  return {
    to,
    subject: 'Your Yearly sign-in link',
    text: [
      'Open this link to sign in to Yearly:',
      '',
      url,
      '',
      `It works once and expires in ${SIGN_IN_LINK_MINUTES} minutes.`,
      "If you didn't ask to sign in, you can ignore this email.",
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
                <p style="margin:0 0 24px;font-size:16px;line-height:1.5;">Tap the button to sign in to Yearly.</p>
                <a href="${href}" style="display:inline-block;padding:12px 20px;border-radius:10px;background:#18181b;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;">Sign in</a>
                <p style="margin:24px 0 0;font-size:14px;line-height:1.5;color:#52525b;">It works once and expires in ${SIGN_IN_LINK_MINUTES} minutes. If you didn&#39;t ask to sign in, you can ignore this email.</p>
                <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#71717a;word-break:break-all;">If the button doesn&#39;t work, open this link: <a href="${href}" style="color:#71717a;">${href}</a></p>
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
