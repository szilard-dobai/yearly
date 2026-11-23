import {
  escapeSlackText,
  formatSlackLocation,
  postSlackMessage,
  type SlackMessage,
} from '@/lib/slack'

export type SignUpMethod = 'email' | 'google'

export type SignUp = {
  method: SignUpMethod | null
  country?: string
}

const METHOD_LABELS: Record<SignUpMethod, string> = {
  email: 'an email code',
  google: 'Google',
}

export function getSignUpMethod(path?: string): SignUpMethod | null {
  if (path === '/sign-in/email-otp') return 'email'
  if (path === '/callback/google') return 'google'
  return null
}

export function buildSignUpSlackMessage(
  signUp: SignUp,
  total: number
): SlackMessage {
  const title = `New account (${total} total)`
  const details = [
    signUp.method
      ? `Signed up with ${METHOD_LABELS[signUp.method]}`
      : 'Sign-up method unknown',
    formatSlackLocation(signUp.country),
  ].join(' · ')

  return {
    text: title,
    blocks: [
      { type: 'section', text: { type: 'mrkdwn', text: `*${title}*` } },
      {
        type: 'context',
        elements: [{ type: 'mrkdwn', text: escapeSlackText(details) }],
      },
    ],
  }
}

export async function notifySignUpToSlack(
  signUp: SignUp,
  countAccounts: () => Promise<number>
): Promise<void> {
  const webhookUrl = process.env.SLACK_FEEDBACK_WEBHOOK_URL
  if (!webhookUrl) return

  await postSlackMessage(
    webhookUrl,
    buildSignUpSlackMessage(signUp, await countAccounts()),
    'sign-up'
  )
}
