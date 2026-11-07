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
      'In your browser, on your device. We never receive your travel dates, and your images are made in your browser instead of being uploaded. Our usage stats record which countries you add and how many days, never the dates. If you clear your browser data, your trips are deleted too.',
  },
  {
    question: 'Can I post my calendar on Instagram or TikTok?',
    answer:
      'Yes. Every export is a JPEG you can post anywhere, and the monthly image is 9:16, the shape of an Instagram or TikTok story.',
  },
  {
    question: 'Can I add trips from last year?',
    answer:
      'Yes. Pick last year from the year menu at the top of the page and add those trips.',
  },
  {
    question: 'What if I was in two countries on one day?',
    answer:
      'Add both. The day shows the two flags split diagonally. Each day holds up to two countries.',
  },
]
