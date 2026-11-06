import { describe, expect, it } from 'vitest'
import { detectInAppBrowser } from './in-app-browser'

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
const ANDROID_WEBVIEW =
  'Mozilla/5.0 (Linux; Android 14; SM-S928W Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0.6261.119 Mobile Safari/537.36'

describe('detectInAppBrowser', () => {
  it.each([
    [
      'Threads',
      `${ANDROID_WEBVIEW} Barcelona 324.0.0.25.109 Android (34/14; 600dpi; 495x1082; samsung; SM-S928W; e3q; qcom; en_CA; 581020806)`,
    ],
    [
      'Threads',
      `${IPHONE} Barcelona 356.0.0.24.77 (iPhone15,3; iOS 18_5; en_SG; en; scale=3.00; 1290x2796; 0)`,
    ],
    [
      'Instagram',
      `${IPHONE} Instagram 356.0.0.24.77 (iPhone15,3; iOS 18_5; en_SG; en; scale=3.00; 1290x2796; 653409867)`,
    ],
    [
      'Instagram',
      'Mozilla/5.0 (Linux; Android 6.0.1; ASUS_Z011D Build/MMB29P; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/67.0.3396.87 Mobile Safari/537.36 Instagram 53.0.0.13.84 Android (23/6.0.1; 480dpi; 1080x1920; asus; ASUS_Z011D; ASUS_Z011; qcom; fr_FR; 116756948)',
    ],
    [
      'Facebook',
      `${IPHONE} [FBAN/FBIOS;FBAV/489.0.0.38.107;FBBV/701234567;FBDV/iPhone15,3;FBMD/iPhone;FBSN/iOS;FBSV/18.5;FBSS/3;FBID/phone;FBLC/en_GB;FBOP/5;FBRV/0]`,
    ],
    ['Facebook', `${ANDROID_WEBVIEW} [FB_IAB/FB4A;FBAV/489.0.0.62.109;]`],
    ['Facebook', `${ANDROID_WEBVIEW} MetaIAB Facebook`],
    [
      'Messenger',
      `${IPHONE} [FBAN/MessengerForiOS;FBAV/489.0.0.38.107;FBBV/701234567;FBDV/iPhone15,3]`,
    ],
    [
      'Messenger',
      `${ANDROID_WEBVIEW} [FB_IAB/Orca-Android;FBAV/489.0.0.62.109;]`,
    ],
    [
      'TikTok',
      `${IPHONE} musical_ly_21.0.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/en Region/SG WKWebView/1`,
    ],
    [
      'TikTok',
      `${IPHONE} BytedanceWebview/d8a21c6 trill_34.9.0 JsSdk/2.0 NetType/4G Channel/App Store ByteLocale/en Region/MY`,
    ],
    [
      'TikTok',
      `${ANDROID_WEBVIEW} musical_ly_2022704050 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/27.4.5 ByteLocale/en BytedanceWebview/d8a21c6`,
    ],
    ['ByteDance app', `${IPHONE} JsSdk/2.0 BytedanceWebview/d8a21c6`],
    ['Xiaohongshu', `${IPHONE} discover/8.20 XHS/8.20.0 NetType/WiFi`],
    [
      'WeChat',
      `${IPHONE} MicroMessenger/8.0.50(0x1800323a) NetType/WIFI Language/en`,
    ],
    ['LINE', `${IPHONE} Safari Line/13.18.0`],
    ['LINE', `${ANDROID_WEBVIEW} Line/13.18.1/IAB`],
    ['LinkedIn', `${IPHONE} [LinkedInApp]/9.24.1488`],
    [
      'Snapchat',
      `${IPHONE} Snapchat/13.40.0.46 (like Safari/8621.1.15.10.7, panda)`,
    ],
    ['Pinterest', `${IPHONE} Pinterest/iOS`],
    ['Pinterest', `${ANDROID_WEBVIEW} [Pinterest/Android]`],
    [
      'Reddit',
      `${ANDROID_WEBVIEW} Reddit/Version 2022.28.0/Build 533235/Android 12`,
    ],
    ['X', `${IPHONE} Twitter for iPhone/10.80`],
    [
      'Telegram',
      `${ANDROID_WEBVIEW} Telegram-Android/11.5.3 (Samsung SM-S928W; Android 14; SDK 34; HIGH)`,
    ],
    [
      'Discord',
      'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) discord/1.0.9003 Chrome/91.0.4472.164 Electron/13.4.0 Safari/537.36',
    ],
    [
      'Google app',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) GSA/389.0.799123456 Mobile/15E148 Safari/604.1',
    ],
  ])('labels %s', (label, userAgent) => {
    expect(detectInAppBrowser(userAgent)).toBe(label)
  })

  it('recognises Telegram from the bridge it injects into the page', () => {
    expect(detectInAppBrowser(IPHONE, { TelegramWebviewProxy: {} })).toBe(
      'Telegram'
    )
  })

  it.each([
    [
      'Safari',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
    ],
    [
      'Chrome on Android',
      'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
    ],
    [
      'Chrome on iOS',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1',
    ],
    [
      'desktop Chrome',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
    ],
    [
      'Firefox',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
    ],
    [
      'Pinterest crawler',
      'Mozilla/5.0 (compatible; Pinterestbot/1.0; +http://www.pinterest.com/bot.html)',
    ],
    [
      'Reddit crawler',
      'Mozilla/5.0 (compatible; Redditbot/1.0; +http://www.reddit.com/feedback)',
    ],
  ])('leaves %s unlabelled', (_, userAgent) => {
    expect(detectInAppBrowser(userAgent)).toBeUndefined()
  })

  it('handles an empty user agent', () => {
    expect(detectInAppBrowser('')).toBeUndefined()
  })
})
