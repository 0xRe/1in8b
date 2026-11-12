import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LOCALES } from '../src/lib/i18n';
import { duoPath } from '../src/lib/site-url';
import { getDuoEntryCopy } from '../src/lib/duo-entry-copy';

// Exercise the actual home component, route head and server boundary; only the
// Cloudflare runtime and framework SSR transport are replaced for Node.
const require = createRequire(import.meta.url);
const { buildSync } = require(require.resolve('esbuild', { paths: [require.resolve('wrangler')] }));
const source = buildSync({
  stdin: { contents: `export { DuoEndingCard, DuoFooterLink } from './src/components/DuoDiscoveryCard'; export { GameApp } from './src/components/GameApp'; export { Route } from './src/routes/together'; export { default as server } from './src/server';`, resolveDir: process.cwd() },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', loader: { '.css': 'empty', '.md': 'text' }, define: { 'import.meta.env.PROD': 'false' },
}).outputFiles[0].text;
const loaded = { exports: {} as any };
let ssrHtml = '';
new Function('require', 'module', 'exports', source)((name: string) => {
  if (name === 'cloudflare:workers') return { env: {}, DurableObject: class {} };
  if (name === '@tanstack/react-start/server-entry') return { fetch: async () => new Response(ssrHtml, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }) };
  return require(name);
}, loaded, loaded.exports);
const { DuoEndingCard, DuoFooterLink, GameApp, Route, server } = loaded.exports;

test('all home pages lead with a localized two-player action, followed by solo play', () => {
  for (const { code } of LOCALES) {
    const copy = getDuoEntryCopy(code);
    const html = renderToStaticMarkup(createElement(GameApp, { locale: code }));
    const anchor = html.match(/<a\b[^>]*class="duo-entry button"[^>]*>[\s\S]*?<\/a>/)?.[0];
    assert.ok(anchor, code);
    assert.ok(anchor.includes(copy.label) && anchor.includes(copy.footerLabel), code);
    assert.ok(anchor.includes(`href="${duoPath(code)}"`), code);
    assert.ok(html.indexOf(anchor) < html.indexOf('class="solo-entry"'), code);
    assert.ok(html.includes(copy.soloLabel), code);
    assert.doesNotMatch(html, /duo-beta|duo-mode-language|English story|English only/i, code);
  }
});

test('together has complete, generic social metadata and preserves invitation privacy', () => {
  const head = Route.options.head();
  const meta = Object.fromEntries(head.meta.map((entry: any) => [entry.name ?? entry.property ?? 'title', entry.content ?? entry.title]));
  assert.equal(head.links.find((entry: any) => entry.rel === 'canonical')?.href, 'https://1in8bn.com/together/');
  assert.equal(meta['og:url'], 'https://1in8bn.com/together/');
  assert.equal(meta['og:title'], meta.title);
  assert.equal(meta['og:description'], meta.description);
  assert.equal(meta['og:image'], 'https://1in8bn.com/og/duo-lifetimes.png');
  assert.equal(meta['og:image:secure_url'], meta['og:image']);
  assert.equal(meta['og:image:width'], '1200');
  assert.equal(meta['og:image:height'], '630');
  assert.equal(meta['twitter:card'], 'summary_large_image');
  for (const key of ['title', 'description', 'image']) assert.equal(meta[`twitter:${key}`], meta[`og:${key}`]);
  assert.match(meta.description, /two-player journey through two lifetimes/);
  assert.equal(meta.robots, undefined);
  assert.equal(meta.referrer, 'no-referrer');
  assert.ok(!JSON.stringify(head).includes('?'));
});

test('together social image is a real PNG with its advertised dimensions', () => {
  const head = Route.options.head();
  const meta = Object.fromEntries(head.meta.map((entry: any) => [entry.name ?? entry.property ?? 'title', entry.content ?? entry.title]));
  const image = new URL(meta['og:image']);
  const png = readFileSync(new URL(`../public${image.pathname}`, import.meta.url));
  assert.deepEqual(png.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  assert.equal(meta['og:image:type'], 'image/png');
  assert.equal(png.subarray(12, 16).toString(), 'IHDR');
  assert.equal(png.readUInt32BE(16), Number(meta['og:image:width']));
  assert.equal(png.readUInt32BE(20), Number(meta['og:image:height']));
});

test('server leaves together previews generic even when invitation and solo-share query data are supplied', async () => {
  const head = Route.options.head();
  ssrHtml = '<!doctype html>' + renderToStaticMarkup(createElement('html', {},
    createElement('head', {}, ...head.meta.map((entry: any, key: number) => entry.title
      ? createElement('title', { key }, entry.title)
      : createElement('meta', { key, ...entry })), ...head.links.map((entry: any, key: number) => createElement('link', { key, ...entry }))),
    createElement('body', {}, 'A life, together')));
  for (const path of ['/together', '/together/', ...LOCALES.filter(l => l.code !== 'en').map(l => duoPath(l.code))]) {
    const response = await server.fetch(new Request(`https://1in8bn.com${path}?room=ec9d4387-a3fa-4ef1-a98c-662afc17dcc1&invite=private-invite-secret&name=PrivateGuest&n=PrivateGuest&born=JPN&life=hwvjf4-91-2026-F-2-84-5`));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-robots-tag'), 'noindex, follow');
    assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
    assert.match(response.headers.get('permissions-policy') ?? '', /microphone=\(self\)/);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    const html = await response.text();
    assert.equal(html, ssrHtml);
    assert.doesNotMatch(html, /private-invite-secret|PrivateGuest|ec9d4387-a3fa-4ef1-a98c-662afc17dcc1|hwvjf4/);
    assert.match(html, /property="og:image" content="https:\/\/1in8bn.com\/og\/duo-lifetimes.png"/);
  }
});

test('all supported home, footer and ending screens feature prominent duo discovery without external sister site', () => {
  for (const { code } of LOCALES) {
    const copy = getDuoEntryCopy(code);
    const html = renderToStaticMarkup(createElement(GameApp, { locale: code }));

    // pov.pet and sister-site must be completely gone
    assert.doesNotMatch(html, /pov\.pet/);
    assert.doesNotMatch(html, /sister-site/);

    // Duo mode links must exist on home and footer
    assert.ok(html.includes(`href="${duoPath(code)}"`), code);
    assert.ok(html.includes(copy.footerLabel), code);
    const footerLink = html.match(/<a\b[^>]*class="duo-footer-link"[^>]*>[\s\S]*?<\/a>/)?.[0];
    assert.ok(footerLink, code);
    assert.ok(footerLink.includes(copy.footerLabel), code);

    // Duo ending card verification for all locales
    const endingHtml = renderToStaticMarkup(createElement(DuoEndingCard, { locale: code }));
    assert.doesNotMatch(endingHtml, /pov\.pet/);
    assert.ok(endingHtml.includes(`href="${duoPath(code)}"`), code);
    assert.ok(endingHtml.includes(copy.endingTitle), code);
    assert.ok(endingHtml.includes(copy.endingBody), code);
    assert.ok(endingHtml.includes(copy.endingCta), code);
  }
});

test('removed community, presence and feedback APIs return 404 without a database', async () => {
  for (const path of ['/api/presence', '/api/feedback', '/api/memorials']) {
    for (const method of ['GET', 'POST']) {
      const response = await server.fetch(new Request(`https://example.test${path}`, { method }));
      assert.equal(response.status, 404);
    }
  }
});
