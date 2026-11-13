import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email/send'
import { signInLinkEmail } from '@/lib/email/sign-in-link'
import { headers } from 'next/headers'
import { createAuth } from './config'

export const auth = createAuth({
  db,
  sendSignInLink: (email, url) => sendEmail(signInLinkEmail(email, url)),
})

export type Session = typeof auth.$Infer.Session

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}
