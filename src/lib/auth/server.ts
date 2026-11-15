import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email/send'
import { signInCodeEmail } from '@/lib/email/sign-in-code'
import { deleteUserVideos } from '@/lib/videos/delete'
import { headers } from 'next/headers'
import { createAuth } from './config'

export const auth = createAuth({
  db,
  sendSignInCode: (email, code) => sendEmail(signInCodeEmail(email, code)),
  beforeDeleteUser: (userId) => deleteUserVideos(db, userId),
})

export type Session = typeof auth.$Infer.Session

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}
