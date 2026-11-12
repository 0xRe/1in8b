import { countryName, getCountryById } from '../game/countries';
import { createLife, DEFAULT_SETTINGS } from '../game/engine';
import { translator, validLocale, type Locale } from './i18n';
import { cleanShareName, decodeLifeCode, encodeLifeCode } from './life-share';
import { lifeCardPng } from './og-card';
import { SITE } from './site-identity';
import { birthOdds, fillViral, rareAge, viralCopy } from './viral-copy';

export type SharePreview = { title: string; description: string; url: string; image?: string; imageAlt?: string };

/** Personal link preview for invitations: who lived, where and how long, drawn from the link alone. */
export function sharePreview(input: URL): SharePreview | null {
  const segment = input.pathname.split('/')[1] ?? '', locale: Locale = segment && validLocale(segment) ? segment as Locale : 'en';
  const params = input.searchParams, code = decodeLifeCode(params.get('life')), explicitCountry = getCountryById(params.get('born') ?? '');
  const country = explicitCountry ?? (code ? createLife(DEFAULT_SETTINGS, code.seed).migration.birthCountry : null);
  if (!code && !country) return null;
  const copy = viralCopy(locale), place = country ? countryName(country, locale) : '';
  const url = new URL(input.pathname, SITE);
  for (const key of ['born', 'life', 'n']) { const value = params.get(key); if (value) url.searchParams.set(key, value); }
  if (!code) return { title: fillViral(copy.ogBorn, { country: place }), description: copy.ogDescription, url: url.href };
  const name = cleanShareName(params.get('n')), t = translator(locale);
  if (code.age === 0) {
    const title = name && place ? fillViral(copy.bornName, { name, country: place }) : fillViral(copy.ogBorn, { country: place || '1in8bn' });
    return { title, description: [country ? birthOdds(country, locale) : '', copy.ogDescription].filter(Boolean).join(' '), url: url.href, image: `${SITE}/card/${encodeLifeCode(code)}.png`, imageAlt: title };
  }
  const title = fillViral(name ? copy.ogTitle : copy.ogTitleNoName, { name, age: code.age, country: place || '1in8bn' });
  const grain = code.grain === null ? '' : `${fillViral(copy.inviteGrain, { grain: t(`grain.name${code.grain}`) })} `;
  const rare = country ? rareAge(country, code.sex, code.age, locale) : '';
  return { title, description: [rare, grain.trim(), copy.ogDescription].filter(Boolean).join(' '), url: url.href, image: `${SITE}/card/${encodeLifeCode(code)}.png`, imageAlt: title };
}

/** Rewrites the page's Open Graph and Twitter tags; canonical and hreflang links stay on the home page. */
export function withSharePreview(response: Response, preview: SharePreview): Response {
  const values: Record<string, string | undefined> = {
    'og:title': preview.title, 'og:description': preview.description, 'og:url': preview.url,
    'og:image': preview.image, 'og:image:secure_url': preview.image, 'og:image:alt': preview.imageAlt,
    'twitter:title': preview.title, 'twitter:description': preview.description, 'twitter:image': preview.image, 'twitter:image:alt': preview.imageAlt,
  };
  return new HTMLRewriter().on('meta', {
    element(el) {
      const key = el.getAttribute('property') ?? el.getAttribute('name') ?? '';
      const value = values[key];
      if (value !== undefined) el.setAttribute('content', value);
      if (preview.image && key === 'og:image:type') el.setAttribute('content', 'image/png');
    },
  }).transform(response);
}

/** `/card/<life code>.png`: the preview image, deterministic per code, so it is cached for good. */
export async function lifeCardResponse(request: Request, url: URL): Promise<Response | null> {
  const match = url.pathname.match(/^\/card\/([0-9a-zA-Z-]{1,48})\.png$/);
  if (!match) return null;
  const code = decodeLifeCode(match[1]);
  if (!code || request.method !== 'GET' && request.method !== 'HEAD') return new Response('Not found', { status: 404 });
  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default, key = new Request(`${SITE}/card/${encodeLifeCode(code)}.png`);
  const hit = await cache?.match(key);
  if (hit) return hit;
  const body = await lifeCardPng(code);
  const response = new Response(body as BodyInit, { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
  await cache?.put(key, response.clone()).catch(() => {});
  return response;
}
