const IN_APP_BROWSERS: { label: string; pattern: RegExp }[] = [
  { label: 'Threads', pattern: /\bBarcelona[ /]\d/ },
  { label: 'Instagram', pattern: /\bInstagram[ /]\d/ },
  {
    label: 'Messenger',
    pattern: /\b(?:FBAN|FB_IAB)\/(?:Messenger\w*|Orca-Android)/,
  },
  { label: 'Facebook', pattern: /\b(?:FBAN|FBAV|FB_IAB)\/|\bMetaIAB\b/ },
  {
    label: 'TikTok',
    pattern:
      /\b(?:musical_ly|trill)_\d|\bAppName\/(?:musical_ly|trill|musically_go)\b|\bTikTok[ /]\d/,
  },
  { label: 'ByteDance app', pattern: /\bBytedanceWebview\b/ },
  { label: 'Xiaohongshu', pattern: /\bxhsdiscover\b|\b(?:xhs|discover)\/\d/i },
  { label: 'WeChat', pattern: /\bMicroMessenger\//i },
  { label: 'LINE', pattern: /\bLine\/\d/ },
  { label: 'LinkedIn', pattern: /\bLinkedInApp\b/ },
  { label: 'Snapchat', pattern: /\bSnapchat\/\d/ },
  { label: 'Pinterest', pattern: /\bPinterest(?:\/| for )/ },
  { label: 'Reddit', pattern: /\bReddit\// },
  { label: 'X', pattern: /\bTwitter for i(?:Phone|Pad)\b|\bTwitterAndroid\b/ },
  { label: 'Telegram', pattern: /\bTelegram-Android\// },
  { label: 'Discord', pattern: /\bDiscord\/\d/i },
  { label: 'Google app', pattern: /\bGSA\/\d/ },
]

const TELEGRAM_BRIDGES = [
  'TelegramWebview',
  'TelegramWebviewProxy',
  'TelegramWebviewProxyProto',
]

export function detectInAppBrowser(
  userAgent: string,
  scope: object = {}
): string | undefined {
  const match = IN_APP_BROWSERS.find(({ pattern }) => pattern.test(userAgent))
  if (match) return match.label
  if (TELEGRAM_BRIDGES.some((key) => key in scope)) return 'Telegram'
  return undefined
}
