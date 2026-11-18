import { Resend } from 'resend'

export const DEFAULT_EMAIL_FROM = 'Yearly <hello@yearly.world>'

export interface Email {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
  headers?: Record<string, string>
}

export interface SendEmailOptions {
  idempotencyKey?: string
}

export interface SentEmail {
  id: string | null
}

export class EmailSendError extends Error {
  readonly code: string
  readonly statusCode: number | null
  readonly retryAfterMs: number | null

  constructor(
    message: string,
    code: string,
    statusCode: number | null,
    retryAfterMs: number | null = null
  ) {
    super(message)
    this.name = 'EmailSendError'
    this.code = code
    this.statusCode = statusCode
    this.retryAfterMs = retryAfterMs
  }
}

let resend: Resend | null = null

function parseRetryAfter(headers: Record<string, string> | null) {
  const seconds = Number(headers?.['retry-after'])
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : null
}

export async function sendEmail(
  email: Email,
  options: SendEmailOptions = {}
): Promise<SentEmail> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new EmailSendError(
        'RESEND_API_KEY is not set',
        'missing_api_key',
        null
      )
    }
    console.info(
      `[email] RESEND_API_KEY is not set, so this email was not sent.\nTo: ${email.to}\nSubject: ${email.subject}\n\n${email.text}`
    )
    return { id: null }
  }

  resend ??= new Resend(apiKey)
  const { data, error, headers } = await resend.emails.send(
    { from: process.env.EMAIL_FROM || DEFAULT_EMAIL_FROM, ...email },
    options.idempotencyKey ? { idempotencyKey: options.idempotencyKey } : {}
  )
  if (error) {
    throw new EmailSendError(
      `Failed to send email: ${error.message}`,
      error.name,
      error.statusCode,
      parseRetryAfter(headers)
    )
  }
  return { id: data.id }
}
