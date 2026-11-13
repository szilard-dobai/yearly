import { Resend } from 'resend'

export const DEFAULT_EMAIL_FROM = 'Yearly <hello@yearly.world>'

export interface Email {
  to: string
  subject: string
  html: string
  text: string
}

let resend: Resend | null = null

export async function sendEmail(email: Email) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RESEND_API_KEY is not set')
    }
    console.info(
      `[email] RESEND_API_KEY is not set, so this email was not sent.\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}`
    )
    return
  }

  resend ??= new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM,
    ...email,
  })
  if (error) {
    throw new Error(`Failed to send email: ${error.message}`)
  }
}
