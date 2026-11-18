import { emailHtml } from './layout'
import type { Email } from './send'

export const SIGN_IN_CODE_MINUTES = 10

export function signInCodeEmail(to: string, code: string): Email {
  return {
    to,
    subject: `${code} is your Yearly sign-in code`,
    text: [
      `Your Yearly sign-in code is ${code}`,
      '',
      `Type it where you asked to sign in. It expires in ${SIGN_IN_CODE_MINUTES} minutes.`,
      "If you didn't ask to sign in, you can ignore this email.",
    ].join('\n'),
    html: emailHtml({
      title: `${code} is your Yearly sign-in code`,
      body: `<p style="margin:0 0 16px;font-size:16px;line-height:1.5;">Your sign-in code is</p>
                <p style="margin:0 0 24px;font-size:32px;font-weight:600;letter-spacing:8px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${code}</p>
                <p class="muted" style="margin:0;font-size:14px;line-height:1.5;color:#52525b;">Type it where you asked to sign in. It expires in ${SIGN_IN_CODE_MINUTES} minutes. If you didn&#39;t ask to sign in, you can ignore this email.</p>`,
    }),
  }
}
