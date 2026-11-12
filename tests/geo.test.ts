import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { publicDocumentResponse, sitemapText } from '../src/lib/discovery';
import { LOCALES } from '../src/lib/i18n';
import { localeUrl, duoPath } from '../src/lib/site-url';
import { SITE } from '../src/lib/site-identity';
const notices = readFileSync(new URL('../THIRD_PARTY_NOTICES.md', import.meta.url), 'utf8');

test('public documents retain GET, HEAD, conditional caching and method restrictions', async () => {
  for (const path of ['/robots.txt', '/sitemap.xml', '/THIRD_PARTY_NOTICES.txt']) {
    const request = (method = 'GET', headers = {}) => new Request(`${SITE}${path}`, { method, headers });
    const get = await publicDocumentResponse(request(), notices);
    assert.ok(get); assert.equal(get.status, 200);
    const body = await get.text(); assert.ok(body.length);
    const etag = get.headers.get('etag'); assert.ok(etag);
    const head = await publicDocumentResponse(request('HEAD'), notices);
    assert.ok(head); assert.equal(await head.text(), ''); assert.equal(head.headers.get('etag'), etag);
    const cached = await publicDocumentResponse(request('GET', { 'If-None-Match': etag }), notices);
    assert.equal(cached?.status, 304);
    const post = await publicDocumentResponse(request('POST'), notices);
    assert.equal(post?.status, 405); assert.equal(post.headers.get('allow'), 'GET, HEAD');
    if (path === '/THIRD_PARTY_NOTICES.txt') {
      assert.equal(body, notices); assert.match(body, /Copyright \(c\) 2026 Royce/);
    }
  }
});
test('sitemap exposes only solo and two-player entry points', () => {
  const urls = [...sitemapText().matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
  assert.equal(urls.length, LOCALES.length * 2);
  assert.equal(new Set(urls).size, urls.length);
  for (const locale of LOCALES) {
    assert.ok(urls.includes(localeUrl(locale.code)));
    assert.ok(urls.includes(`${SITE}${duoPath(locale.code)}`));
  }
});
test('removed reference and marketing endpoints cannot expose private state', async () => {
  for (const path of ['/llms.txt', '/llms-full.txt', '/reference/index.md', '/index.md', '/api/duo/rooms/test'])
    assert.equal(await publicDocumentResponse(new Request(`${SITE}${path}`), notices), null);
});
