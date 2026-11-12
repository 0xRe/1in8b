import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { DuoGame } from '../components/DuoGame';
import { ensureLocale, validLocale, type Locale } from '../lib/i18n';
import { getDuoLandingCopy } from '../lib/duo-i18n';
import { duoPath } from '../lib/site-url';
import { ogLocales } from '../lib/seo';
import { SITE } from '../lib/site-identity';

const image = SITE + '/og/duo-lifetimes.png';
const imageAlt = 'A life, together — two pixel portraits from the free two-player life simulator';

export const Route = createFileRoute('/$locale_/together')({
  beforeLoad: async ({ params, location }) => {
    if (!validLocale(params.locale)) throw notFound();
    if (params.locale === 'en') {
      throw redirect({
        to: '/together/',
        search: (prev) => prev,
        hash: location.hash,
        statusCode: 301,
      });
    }
    await ensureLocale(params.locale as Locale);
  },
  head: ({ params }) => {
    const locale = params.locale as Locale;
    const copy = getDuoLandingCopy(locale);
    const title = `${copy.title1} ${copy.title2} | 1in8bn`;
    const description = copy.introNote;
    const url = SITE + duoPath(locale);
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { name: 'referrer', content: 'no-referrer' },
        ...Object.entries({
          title,
          description,
          url,
          type: 'website',
          site_name: '1in8bn',
          locale: ogLocales[locale],
          image,
          'image:secure_url': image,
          'image:type': 'image/png',
          'image:width': '1200',
          'image:height': '630',
          'image:alt': imageAlt,
        }).map(([key, content]) => ({ property: `og:${key}`, content })),
        ...Object.entries({
          card: 'summary_large_image',
          title,
          description,
          image,
          'image:alt': imageAlt,
        }).map(([key, content]) => ({ name: `twitter:${key}`, content })),
      ],
      links: [{ rel: 'canonical', href: url }],
    };
  },
  component: () => <DuoGame initialLocale={Route.useParams().locale as Locale} />,
});
