import { db } from '@/lib/db'
import { user } from '@/lib/db/schema'
import { sendEmail } from '@/lib/email/send'
import { signInCodeEmail } from '@/lib/email/sign-in-code'
import { headers } from 'next/headers'
import { after } from 'next/server'
import { createAuth } from './config'
import { notifySignUpToSlack } from './slack'

export const auth = createAuth({
  db,
  sendSignInCode: async (email, code) => {
    await sendEmail(signInCodeEmail(email, code))
  },
  onSignUp: (signUp) => {
    after(() => notifySignUpToSlack(signUp, () => db.$count(user)))
  },
})

export type Session = typeof auth.$Infer.Session

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}
