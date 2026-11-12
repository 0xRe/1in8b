import test from 'node:test';
import assert from 'node:assert/strict';
import { translator } from '../src/lib/i18n';
import { createLife, DEFAULT_SETTINGS } from '../src/game/engine';
import { generateBiography } from '../src/lib/ending-story';
import { recordRows } from '../src/lib/record-export';

test('regional money is consistent in event text, biography and annual export without mutating a life', () => {
  const t = translator('en', 'SGD');
  assert.match(t('event.descendantWedding', { name: 'Ada', spouse: 'Lee', amount: 1000 }), /S\$790/);
  const life = createLife(DEFAULT_SETTINGS, 42);
  life.stats.netAssets = 1000;
  life.history[0].netAssets = 1000;
  const before = JSON.stringify(life);
  assert.match(generateBiography(life, 'en', t), /S\$790/);
  const rows = recordRows(life, t, 'en');
  assert.match(String(rows[0][6]), /Singapore/);
  assert.equal(rows[1][6], 790);
  assert.equal(JSON.stringify(life), before);
});

import { chooseMoneyRegion, readMoneyRegion, moneyPresentation, MONEY_REGIONS } from '../src/lib/money-display';
import * as MONEY_HELPERS from '../src/lib/money-display';

test('English reference price display preserves sign and compact boundaries', () => {
 const s=moneyPresentation('en','SGD');
 for(const [n,label] of [[0,'S$0'],[1000,'S$790'],[-1000,'-S$790'],[15000,'S$12K'],[1500000,'S$1.2M']] as const) assert.equal(s.money(n),label);
 const u=moneyPresentation('en');
 for(const [n,label] of [[9999,'$9,999'],[10000,'$10K'],[1e6,'$1.0M'],[1e7,'$10M'],[1e9,'$1.0B'],[1e10,'$10B']] as const) assert.equal(u.money(n),label);
 assert.equal(s.money(15000,false),'S$11,850');
 assert.equal(s.money(NaN),'—');
});
test('all price regions round trip economic input without changing its base',()=>{
 assert.equal(Object.keys(MONEY_REGIONS).length,29);
 // The original's 15 English display constants are unchanged.
 assert.deepEqual(Object.keys(MONEY_REGIONS).slice(0,15).map(k=>MONEY_REGIONS[k as keyof typeof MONEY_REGIONS].factor),[1,.68,.75,1.17,1.4,1.47,20.1,67.8,19.1,.79,1.36,195,4.75,43.5,7.42]);
 for(const code of Object.keys(MONEY_REGIONS) as (keyof typeof MONEY_REGIONS)[]) {
  const m=moneyPresentation('en',code);
  for(const n of [0,1,79,1000,-75,1e7]) assert.ok(Math.abs(m.baseAmount(m.displayAmount(n))-n)<1e-7);
 }
 assert.equal(moneyPresentation('ja','SGD').moneyRegion,'SGD');
});
test('saved preference wins over timezone and browser language, denied storage still works',()=>{
 assert.equal(chooseMoneyRegion('GBP','Asia/Singapore',['en-CA']),'GBP');
 assert.equal(chooseMoneyRegion('bad','Asia/Singapore',['en-CA']),'USD');
 assert.equal(chooseMoneyRegion(null,'UTC',['en-CA']),'USD');
 assert.equal(chooseMoneyRegion(null,'UTC',['fr-FR']),'USD');
 assert.equal(chooseMoneyRegion(null,'UTC',['en-US']),'USD');
 assert.equal(readMoneyRegion({getItem(){throw new Error('denied')}},'Asia/Singapore'),'USD');
});
test('currency does not rewrite names or already formatted monetary parameters',()=>{
 const t=translator('en','SGD');
 assert.match(t('event.descendantWedding',{name:'$1000',spouse:'Lee',amount:1000}),/\$1000 married Lee.*S\$790/);
 assert.match(t('bio.wealthLeft',{amount:t.money(1000)}),/S\$790/);
});

test('selected page language controls defaults regardless of timezone or browser language',()=>{
 const expected={en:'USD',de:'EUR_DE',fr:'EUR_FR',es:'EUR_ES',ja:'JPY',ko:'KRW','zh-hans':'CNY',zh:'TWD',vi:'VND',th:'THB',tr:'TRY',ru:'RUB',pt:'BRL',id:'IDR'};
 for(const [locale,currency] of Object.entries(expected)){
  assert.equal(chooseMoneyRegion(null,'Asia/Singapore',['en-GB'],locale),currency);
  assert.equal(chooseMoneyRegion('invalid','Asia/Tokyo',['ja-JP'],locale),currency);
  assert.equal(chooseMoneyRegion('GBP','Asia/Tokyo',['ja-JP'],locale),'GBP');
  assert.equal(readMoneyRegion({getItem(){throw Error('denied')}},'Asia/Singapore',['en-GB'],locale),currency);
 }
 assert.equal(chooseMoneyRegion(null,'Asia/Tokyo',['ja-JP'],'unknown'),'USD');
});
test('other languages format amounts in the chosen place\'s currency',()=>{
 const ja=moneyPresentation('ja','JPY');
 assert.match(ja.money(1000),/94,500|94,500/);
 assert.match(ja.money(1000),/[¥￥]/);
 assert.match(moneyPresentation('de','EUR_DE').money(1000),/700\s?€/);
 assert.match(moneyPresentation('ja','JPY').money(1e6),/億|万/);
 assert.match(moneyPresentation('fr','USD').money(1000),/\$/);
 assert.equal(moneyPresentation('ja','JPY').moneyLabel,'JPY');
 const { moneyPlaceName } = MONEY_HELPERS;
 assert.equal(moneyPlaceName('EUR_DE','fr'),'Allemagne');
 assert.equal(moneyPlaceName('EUR_DE','en'),'Germany');
});
