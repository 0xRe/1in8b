import assert from 'node:assert/strict';
import test from 'node:test';
import { advanceYear, createLife, DEFAULT_SETTINGS } from '../src/game/engine';
import { cleanShareName, decodeLifeCode, encodeLifeCode, lifeShareCode, lifeShareUrl, readLifeInvitation } from '../src/lib/life-share';
import { encodePng, lifeCardPng, OG_HEIGHT, OG_WIDTH } from '../src/lib/og-card';
import { sharePreview } from '../src/lib/share-preview';
import { viralCopy } from '../src/lib/viral-copy';
import { LOCALES } from '../src/lib/i18n';

const finished = (seed: number) => { let life = createLife({ ...DEFAULT_SETTINGS, autoChoices: true }, seed); while (life.alive) life = advanceYear(life); return life; };

test('a finished life round-trips through its share code and link', () => {
  const life = finished(9157), code = lifeShareCode(life);
  assert.deepEqual(decodeLifeCode(encodeLifeCode(code)), code);
  assert.ok(code.sceneAge <= code.age);
  assert.notEqual(code.kind, 'memorial', 'the preview shows a remembered moment, not the grave');
  const url = new URL(lifeShareUrl('https://1in8bn.com/fr/?born=ETH', life));
  assert.equal(url.searchParams.get('born'), 'ETH');
  assert.equal(url.searchParams.has('via'), false);
  const invitation = readLifeInvitation(url.search);
  assert.deepEqual(invitation?.code, code);
  assert.equal(invitation?.name, cleanShareName(life.name));
});

test('lives in progress share no code, newborns share a nursery code, malformed codes are rejected', () => {
  const newborn = createLife(DEFAULT_SETTINGS, 4);
  let growing = newborn; while (growing.age < 3) growing = advanceYear({ ...growing, pendingDecision: null });
  assert.equal(new URL(lifeShareUrl('https://1in8bn.com/', growing)).searchParams.has('life'), false);
  const born = decodeLifeCode(new URL(lifeShareUrl('https://1in8bn.com/', newborn)).searchParams.get('life'));
  assert.deepEqual([born?.age, born?.kind, born?.grain], [0, 'nursery', null]);
  const preview = sharePreview(new URL(lifeShareUrl(`https://1in8bn.com/?born=${newborn.country.id}`, newborn)))!;
  assert.match(preview.title, /was just born in/);
  assert.match(preview.description, /^About 1 in [\d,]+ babies in the world is born in /);
  for (const bad of ['', 'zz', '1-2-3', 'abc-200-2026-F-2-10-1', 'abc-70-2026-X-2-10-1', 'abc-70-2026-F-99-10-1', 'abc-70-2026-F-2-80-1', 'abc-070-2026-F-2-10-1', 'abc-70-2026-F-2-10-99', `${'z'.repeat(8)}-70-2026-F-2-10-1`])
    assert.equal(decodeLifeCode(bad), null, bad);
  assert.equal(cleanShareName('<b>"Ana"</b>\u0007  Lee'), 'bAna/b Lee');
});

test('the preview image is a 1200×630 PNG drawn from the code alone', async () => {
  const png = await lifeCardPng(lifeShareCode(finished(42)));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const view = new DataView(png.buffer, png.byteOffset);
  assert.equal(view.getUint32(16), OG_WIDTH);
  assert.equal(view.getUint32(20), OG_HEIGHT);
  assert.ok(png.length < 120_000, `compact enough for chat previews (${png.length} bytes)`);
  const tiny = await encodePng(new Uint8Array([255, 0, 0]), 1, 1);
  assert.equal(tiny.length, 69);
});

test('invitation links get personal link previews; plain pages keep the site preview', () => {
  const life = finished(777), link = new URL(lifeShareUrl('https://1in8bn.com/de/?born=ETH', life, 'whatsapp'));
  const preview = sharePreview(link)!;
  assert.match(preview.title, /\d+ Jahre alt/);
  assert.ok(preview.title.includes(cleanShareName(life.name)));
  assert.match(preview.image!, /^https:\/\/1in8bn\.com\/card\/[0-9a-zA-Z-]+\.png$/);
  assert.equal(new URL(preview.url).searchParams.has('via'), false, 'the channel is attribution, not part of the shared object');
  assert.equal(sharePreview(new URL('https://1in8bn.com/?born=ETH'))?.image, undefined);
  assert.equal(sharePreview(new URL('https://1in8bn.com/')), null);
  assert.equal(sharePreview(new URL('https://1in8bn.com/?life=<script>&born=nowhere')), null);
});

test('every locale has the full invitation copy with matching placeholders', () => {
  const en = viralCopy('en'), holes = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join();
  for (const { code } of LOCALES) {
    const copy = viralCopy(code);
    assert.notEqual(copy, code === 'en' ? null : en, `${code} has its own copy`);
    for (const key of Object.keys(en) as (keyof typeof en)[]) assert.equal(holes(copy[key]), holes(en[key]), `${code}.${key}`);
  }
});

test('the brag line appears only for ages most people born there never reach', async () => {
  const { rareAge } = await import('../src/lib/viral-copy');
  const { getCountryById } = await import('../src/game/countries');
  const ethiopia = getCountryById('ETH')!;
  assert.equal(rareAge(ethiopia, 'F', 70, 'en'), '');
  assert.equal(rareAge(ethiopia, 'F', 30, 'en'), '');
  assert.match(rareAge(ethiopia, 'F', 85, 'en'), /^Only \d+% of people born in Ethiopia reach 85\.$/);
  assert.match(rareAge(ethiopia, 'F', 108, 'en'), /^Only <1%/);
});

test('an inviter is remembered for 30 days and rejected when malformed', async () => {
  const { rememberInviter, readInviter } = await import('../src/lib/life-share');
  const values = new Map<string, string>();
  Object.assign(globalThis, { localStorage: { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) } });
  const code = lifeShareCode(finished(42)), now = 1_800_000_000_000;
  rememberInviter(code, 'Ana <b>', 'NGA', now);
  assert.deepEqual(readInviter(now + 1000), { code: encodeLifeCode(code), name: 'Ana b', country: 'NGA', at: now });
  assert.equal(readInviter(now + 31 * 864e5), null);
  values.set('1in8bn-invited-by', JSON.stringify({ code: 'nope', name: 'x', country: 'NGA', at: now }));
  assert.equal(readInviter(now), null);
  values.set('1in8bn-invited-by', '{broken');
  assert.equal(readInviter(now), null);
});

test('life pattern wording is localised consistently in sharing and filters', async () => {
  const { translator } = await import('../src/lib/i18n');
  const expected: Record<string, string> = {
    en: 'pattern', ko: '결', ja: 'かたち', zh: '印記', 'zh-hans': '印记', vi: 'Dấu ấn', fr: 'empreinte', th: 'ร่องรอย',
    es: 'huella', de: 'Muster', tr: 'iz', ru: 'узор', pt: 'marca', id: 'jejak',
  };
  for (const { code } of LOCALES) {
    const t = translator(code), term = expected[code].toLocaleLowerCase();
    for (const text of [t('grain.title'), t('feature.grain'), viralCopy(code).inviteGrain, viralCopy(code).postGrain])
      assert.ok(text.toLocaleLowerCase().includes(term), `${code}: ${text}`);
    assert.ok(t('grain.name5') && !t('grain.name5').startsWith('grain.'));
    const path = code === 'en' ? '/' : `/${code}/`;
    const preview = sharePreview(new URL(`https://1in8bn.com${path}?born=JPN&life=hwvjf4-91-2026-F-2-84-5&n=Sakura+Tanaka`));
    assert.ok(preview?.description.toLocaleLowerCase().includes(term), `${code} preview`);
    assert.ok(preview.description.includes(t('grain.name5')), `${code} pattern name`);
  }
  assert.equal(viralCopy('zh-hans').postGrain.replace('{grain}', translator('zh-hans')('grain.name5')), '我的人生印记：“远方的家”。');
  assert.doesNotMatch(translator('ja')('grain.title'), /木目/);
  assert.doesNotMatch(translator('id')('feature.grain'), /gandum|biji/i);
});
