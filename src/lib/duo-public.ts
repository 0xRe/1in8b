import { SITE } from './site-identity';

export const DUO_PUBLIC_URL = `${SITE}/together/`;
export const DUO_PUBLIC_TITLE = 'A life, together — Free two-player life simulator | 1in8bn';
export const DUO_PUBLIC_DESCRIPTION = 'Invite a friend into a free two-player journey through two lifetimes. Make personal choices, take on shared goals, and keep your own story.';

export const DUO_FAQ = [
  { q: 'Is it really free?', a: 'Yes. Every feature is free, including voice chat and keepsakes. There is no account, subscription or paid pass.' },
  { q: 'Does my friend need an account or an app?', a: 'No. Your friend opens the private link in a browser, picks a nickname and joins. An unused invitation expires after thirty minutes, and you can make a new one from your room.' },
  { q: 'How does voice chat work?', a: 'Voice is optional and powered by Agora RTC. Each person turns it on in the room and allows microphone access. Friends have no extra time limit, and this game does not record or transcribe calls. Text chat always works too.' },
  { q: 'What happens if one of us dies first?', a: 'An early death can happen in either mode. The surviving friend can keep living, and the memories you shared stay in the room.' },
  { q: 'How long does a room last?', a: 'Activity keeps a room for seven days, and a finished room stays for twenty-four hours. Leave temporarily and return on the same browser to pick up your character.' },
];

export const duoStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'VideoGame', '@id': DUO_PUBLIC_URL + '#game', name: 'A life, together',
      url: DUO_PUBLIC_URL, description: DUO_PUBLIC_DESCRIPTION, inLanguage: 'en',
      gamePlatform: 'Web browser', playMode: 'CoOp', isAccessibleForFree: true,
      image: SITE + '/og/duo-lifetimes.png',
    },
    {
      '@type': 'FAQPage', '@id': DUO_PUBLIC_URL + '#faq', url: DUO_PUBLIC_URL,
      mainEntity: DUO_FAQ.map(({ q, a }) => ({
        '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ],
};
