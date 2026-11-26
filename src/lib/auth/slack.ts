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

type SignUpEndpoint = {
  path?: string
  params?: { id?: string }
}

export function getSignUpMethod(
  endpoint?: SignUpEndpoint | null
): SignUpMethod | null {
  if (endpoint?.path === '/sign-in/email-otp') return 'email'
  if (endpoint?.path === '/callback/:id' && endpoint.params?.id === 'google') {
    return 'google'
  }
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
