import { LOCALES } from './i18n';
import { SITE } from './site-identity';
import { localeUrl, duoPath } from './site-url';
import { robotsText } from './seo';

export function sitemapText() {
  const urls = LOCALES.flatMap(locale => [localeUrl(locale.code), `${SITE}${duoPath(locale.code)}`]);
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(url => `<url><loc>${url}</loc></url>`).join('')}</urlset>`;
}

/** Public app entry points and the required third-party notices. */
export async function publicDocumentResponse(request: Request, thirdPartyNotices?: string): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  const body = path === '/robots.txt' ? robotsText
    : path === '/sitemap.xml' ? sitemapText()
    : path === '/THIRD_PARTY_NOTICES.txt' ? thirdPartyNotices : undefined;
  if (body === undefined) return null;
  const headers = new Headers({
    'Content-Type': `${path === '/sitemap.xml' ? 'application/xml' : 'text/plain'}; charset=utf-8`,
    'Cache-Control': 'public, max-age=3600',
    'X-Content-Type-Options': 'nosniff',
  });
  if (!['GET', 'HEAD'].includes(request.method)) {
    headers.set('Allow', 'GET, HEAD');
    return new Response('Method not allowed', { status: 405, headers });
  }
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
  const etag = `"${Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')}"`;
  headers.set('ETag', etag);
  const validators = request.headers.get('If-None-Match')?.split(',').map(value => value.trim().replace(/^W\//, ''));
  if (validators?.some(value => value === '*' || value === etag)) return new Response(null, { status: 304, headers });
  return new Response(request.method === 'HEAD' ? null : body, { headers });
}
