export interface Faq {
  question: string
  answer: string
}

export const faqs: Faq[] = [
  {
    question: 'Is Yearly free?',
    answer:
      "Yes. Making and downloading your calendar and stats images is free. We're also testing an optional paid animated video version.",
  },
  {
    question: 'Do I need an account?',
    answer:
      "No. Open yearly.world in your phone or computer browser and start adding trips. There's nothing to sign up for or install.",
  },
  {
    question: 'Where are my trips stored?',
    answer:
      'In your browser, on your device. We never receive your travel dates, and your images are made in your browser instead of being uploaded. If you clear your browser data, your trips are deleted too.',
  },
  {
    question: 'Can I post it on Instagram or TikTok?',
    answer:
      'Yes. Every export is a JPEG you can post anywhere, and the monthly image is 9:16, the shape of an Instagram or TikTok story.',
  },
  {
    question: 'Can I make one for last year?',
    answer:
      'Yes. Switch to last year at the top of the calendar and add those trips.',
  },
  {
    question: 'What if I was in two countries on one day?',
    answer:
      'Add both. The day shows the two flags split diagonally. Each day holds up to two countries.',
  },
]
