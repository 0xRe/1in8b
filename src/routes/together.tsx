import { createFileRoute } from '@tanstack/react-router';
import { DuoGame } from '../components/DuoGame';

import { DUO_PUBLIC_TITLE as title, DUO_PUBLIC_DESCRIPTION as description, DUO_PUBLIC_URL as url, duoStructuredData } from '../lib/duo-public';
import { SITE } from '../lib/site-identity';

const image = SITE + '/og/duo-lifetimes.png';
const imageAlt = 'A life, together — two pixel portraits from the free two-player life simulator';

export const Route = createFileRoute('/together')({
  head: () => ({
    meta: [
      { title },
      { name: 'description', content: description },
      { name: 'referrer', content: 'no-referrer' },
      ...Object.entries({ title, description, url, type: 'website', site_name: '1in8bn', locale: 'en_US', image,
        'image:secure_url': image, 'image:type': 'image/png', 'image:width': '1200', 'image:height': '630', 'image:alt': imageAlt,
      }).map(([key, content]) => ({ property: `og:${key}`, content })),
      ...Object.entries({ card: 'summary_large_image', title, description, image, 'image:alt': imageAlt,
      }).map(([key, content]) => ({ name: `twitter:${key}`, content })),
    ],
    links: [{ rel: 'canonical', href: url }],
  }),
  component: () => <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(duoStructuredData) }}/>
    <DuoGame initialLocale="en"/>
  </>,
});
