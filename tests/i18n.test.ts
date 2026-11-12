import assert from 'node:assert/strict';
import test from 'node:test';
import { catalogs, EN, LOCALES, translator } from '../src/lib/i18n';
import englishFirstKeys from '../src/lib/english-first-keys.json';

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
test('launch translations remain complete; only listed English-first additions may fall back', () => {
  const pending = new Set(englishFirstKeys);
  assert.equal(pending.size, englishFirstKeys.length);
  for (const key of pending) assert.ok(EN[key]?.trim(), `Unknown English-first key ${key}`);
  for (const { code } of LOCALES) {
    const catalog = code === 'en' ? EN : catalogs[code];
    assert.ok(catalog, `Missing ${code} catalog`);
    assert.deepEqual(Object.keys(catalog).filter(k=>!pending.has(k)).sort(), Object.keys(EN).filter(k=>!pending.has(k)).sort(), code);
    for (const [key, text] of Object.entries(EN)) {
      if (pending.has(key) && !catalog[key]) {
        // Compare rendered output: English templates may use plural forms such as {n|one=…|other=…}.
        assert.equal(translator(code)(key), translator('en')(key), `${code}.${key} explicit English fallback`);
        continue;
      }
      assert.ok(catalog[key]?.trim(), `${code}.${key} is empty`);
      assert.deepEqual(placeholders(catalog[key]), placeholders(text), `${code}.${key} interpolation`);
    }
  }
});

test('changing language translates persistent event keys without rewriting names or user text', () => {
  const params = { name: '<Maya>', age: 40 };
  assert.equal(translator('fr')('event.birth', params), 'Une nouvelle vie commence. Vous vous appelez <Maya>.');
  assert.equal(translator('ja')('years', { n: 12 }), '12年');
  assert.equal(translator('zh')('schoolYears'), '預期受教育年數');
  assert.equal(translator('zh-hans')('schoolYears'), '预期受教育年数');
  assert.equal(translator('ko')('minutes', { n: 30 }), '30분');
});

test('Turkish and Russian are routed locales with plural-aware counts and localized money', () => {
  assert.ok(LOCALES.some(l => l.code === 'tr' && l.html === 'tr'));
  assert.ok(LOCALES.some(l => l.code === 'ru' && l.html === 'ru'));
  const ru = translator('ru'), tr = translator('tr');
  assert.deepEqual([1, 2, 5, 11, 21, 22, 25].map(n => ru('candles', { n })), ['1 свеча', '2 свечи', '5 свечей', '11 свечей', '21 свеча', '22 свечи', '25 свечей']);
  assert.deepEqual([1, 3, 12, 41].map(n => ru('years', { n })), ['1 год', '3 года', '12 лет', '41 год']);
  assert.equal(ru('years'), ru('years', {}));
  assert.equal(tr('candles', { n: 3 }), '3 mum');
  assert.equal(tr('event.birth', { name: 'Ece Kaya' }), 'Yeni bir hayat başlıyor. Adın Ece Kaya.');
  assert.match(ru.money(12345), /12\s345\s\$/);
  assert.match(tr.money(12345), /\$12\.345/);
  assert.equal(ru('event.healthTreatment', { name: 'X', amount: 2283.88 }), 'План лечения выбран. Пациент: X. Семья платит или занимает 2\u00a0284\u00a0$ на лечение.');
  assert.equal(tr('event.descendantUniversity', { name: 'X', amount: 5000 }), 'X üniversiteye başladı. Sen $5.000 katkıda bulundun.');
  assert.equal(translator('de')('event.debtRelief', { forgiven: 1200, remaining: 300 }), 'Verwandte und Gläubiger haben dir 1.200\u00a0$ an Altschulden erlassen. Es verbleiben noch 300\u00a0$.');
  assert.ok(ru('seo.title').length <= 60 && tr('seo.title').length <= 60);
  assert.ok(ru('seo.description').length <= 158 && tr('seo.description').length <= 158);
  for (const code of ['tr', 'ru'] as const) for (const key of Object.keys(catalogs[code])) assert.doesNotMatch(translator(code)(key, { n: 3, age: 3, years: 3 }), /\|\w+=/, `${code}.${key} plural syntax resolves`);
});

test('Portuguese and Indonesian are routed locales with complete catalogs and localized money', () => {
  assert.ok(LOCALES.some(l => l.code === 'pt' && l.html === 'pt-BR'));
  assert.ok(LOCALES.some(l => l.code === 'id' && l.html === 'id'));
  const pt = translator('pt'), id = translator('id');
  assert.equal(pt('event.birth', { name: 'Lucas' }), 'Uma nova vida começa. Seu nome é Lucas.');
  assert.equal(id('event.birth', { name: 'Budi' }), 'Kehidupan baru dimulai. Nama Anda adalah Budi.');
  assert.ok(pt('seo.title'));
  assert.ok(id('seo.title'));
  for (const code of ['pt', 'id'] as const) {
    for (const key of Object.keys(catalogs[code])) {
      assert.doesNotMatch(translator(code)(key, { n: 3, age: 3, years: 3 }), /\|\w+=/, `${code}.${key} plural syntax resolves`);
    }
  }
});

test('Indonesian life events and occupations use the right context', () => {
  const id = translator('id');
  const expected: Record<string, string> = {
    'event.temperament': 'Sifat yang mulai terlihat sejak kecil menjadi bagian dari diri Anda.',
    'event.talent': 'Anda menemukan kegiatan yang terasa mudah dan alami bagi Anda.',
    'event.noSchool': 'Keadaan membuat Anda tidak bisa bersekolah bersama anak-anak lain.',
    'event.childLabor': 'Anda mulai bekerja untuk membantu memenuhi kebutuhan keluarga.',
    'event.schoolReturnRejected': 'Anda meminta untuk kembali bersekolah, tetapi keluarga belum bisa mewujudkannya.',
    'event.schoolReturn': 'Keluarga menemukan cara agar Anda bisa kembali bersekolah.',
    'event.relocation': 'Anda pindah ke kota, menghadapi biaya baru dan peluang baru.',
    'decision.relocation': 'Maukah Anda meninggalkan desa untuk mencari peluang di kota?',
    'job.pilot': 'Pilot', 'job.cook': 'Juru masak', 'job.artisan': 'Pekerja terampil',
    'event.physical.childAid.mobility': 'Alat penyangga dan rehabilitasi membantu Anda bergerak lebih mandiri.',
  };
  for (const [key, value] of Object.entries(expected)) assert.equal(id(key), value, key);
  assert.match(id('event.purchase', { amount: 100 }), /kebutuhan sehari-hari/);
});

test('Portuguese occupations describe a person, not an instruction or broken device', () => {
  const pt = translator('pt');
  assert.equal(pt('job.cook'), 'Cozinheiro');
  assert.equal(pt('job.none'), 'Sem trabalho');
  assert.equal(pt('job.artisan'), 'Profissional de ofício');
});

test('occupation and country labels do not invent rank or country grammar', () => {
  assert.equal(translator('zh-hans')('job.pilot'), '飞行员');
  assert.equal(translator('de')('job.pilot'), 'Pilot');
  assert.equal(translator('fr')('ui.activeCountry', { country: 'Japon', n: 2 }), 'Japon : 2');
});

test('Russian share copy uses a valid age construction for 21 and 91', async () => {
  const { fillViral, viralCopy } = await import('../src/lib/viral-copy');
  for (const age of [21, 91]) {
    const title = fillViral(viralCopy('ru').ogTitle, { name: 'Анна', age, country: 'Япония' });
    const rare = fillViral(viralCopy('ru').rare, { pct: 48, age, country: 'Япония' });
    assert.match(title, new RegExp(`возраст — ${age}`));
    assert.match(rare, new RegExp(`${age}-летнего возраста`));
  }
});

test('health and privacy copy preserves the original meaning across locales', () => {
  assert.match(translator('ko')('event.physical.acquired.polio'), /약해/);
  assert.match(translator('ja')('event.physical.acquired.polio'), /力が弱/);
  assert.match(translator('de')('event.physical.acquired.polio'), /geschwächt/);
  assert.equal(translator('pt')('event.death', { age: 91 }), 'Sua vida chega ao fim aos 91 anos.');
  assert.match(translator('id')('privacyText'), /halaman kenangan/i);
  assert.match(translator('zh-hans')('privacyText'), /导出备份/);
});
