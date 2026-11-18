import { escapeHtml } from './html'

export const EMAIL_LOGO_URL = 'https://www.yearly.world/email/logo.png'

const EMAIL_SERIF = "Newsreader,Georgia,'Times New Roman',serif"
const SANS =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"

export function emailHeading(text: string) {
  return `<h1 style="margin:0 0 16px;font-family:${EMAIL_SERIF};font-size:30px;line-height:1.2;font-weight:400;letter-spacing:-0.01em;">${escapeHtml(text)}</h1>`
}

export function emailButton(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td class="button" style="border-radius:999px;background:#18181b;">
                      <a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a>
                    </td>
                  </tr>
                </table>`
}

export function emailHtml({
  title,
  preview,
  body,
}: {
  title: string
  preview?: string
  body: string
}) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <title>${escapeHtml(title)}</title>
    <style>
      @media (prefers-color-scheme: dark) {
        .page { background: #0a0a0a !important; }
        .card { background: #141414 !important; }
        .text { color: #f4f4f5 !important; }
        .muted { color: #a1a1aa !important; }
        .rule { border-color: #27272a !important; }
        .button { background: #f4f4f5 !important; }
        .button a { color: #18181b !important; }
        .logo { filter: invert(1); }
      }
    </style>
  </head>
  <body class="page" style="margin:0;padding:32px 16px;background:#f4f4f5;font-family:${SANS};color:#18181b;">${
    preview
      ? `
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preview)}</div>`
      : ''
  }
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" style="max-width:440px;background:#ffffff;border-radius:16px;padding:32px;">
            <tr>
              <td class="text" style="color:#18181b;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
                  <tr>
                    <td style="padding-right:10px;vertical-align:middle;"><img class="logo" src="${EMAIL_LOGO_URL}" width="40" height="40" alt="" style="display:block;border:0;"></td>
                    <td class="text" translate="no" style="vertical-align:middle;font-family:${EMAIL_SERIF};font-size:28px;line-height:1;letter-spacing:-0.01em;color:#18181b;">Yearly</td>
                  </tr>
                </table>
                ${body}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}
