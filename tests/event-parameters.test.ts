import assert from 'node:assert/strict';
import test from 'node:test';
import { translator, LOCALES, catalogs } from '../src/lib/i18n';
import { publicCountryName } from '../src/game/countries';

test('descendant career events localize old English save parameters in every language', () => {
  for (const {code} of LOCALES.filter(l=>l.code!=='en')) {
    for(const key of ['event.descendantJob','event.descendantPromotion']) {
      const text=translator(code)(key,{name:'as an engineer',job:'as an engineer'});
      assert.ok(text.includes(catalogs[code]['job.engineer']),`${code} ${key}`);
      assert.equal(text.split('as an engineer').length-1,1,'character names remain verbatim');
    }
  }
});
test('family home and migration events translate parameters without changing save objects',()=>{
  const t=translator('fr');const params={name:'China',country:'South Korea',amount:25};
  assert.ok(t('event.descendantMigration',params).includes(publicCountryName('South Korea','fr')));
  assert.equal(params.country,'South Korea');
  assert.ok(!t('event.descendantHome',{name:'Alex',residence:'independently'}).includes('independently'));
  assert.equal(translator('en')('event.descendantJob',{name:'Alex',job:'as an engineer'}),'Alex has started work as an engineer.');
  assert.equal(t('unknown.key',{country:'South Korea'}),'unknown.key');
});

test('all authored residence variants localize and unknown historical values remain intact',()=>{
  for(const {code} of LOCALES.filter(l=>l.code!=='en')) {
    const t=translator(code);
    for(const [value,key] of [['with you','family.home'],['with their parent','family.parentHome'],['independently','family.independent']]) {
      assert.ok(t('event.descendantHome',{name:'Alex',residence:value}).includes(catalogs[code][key]),code);
    }
    assert.ok(t('event.descendantJob',{name:'Alex',job:'custom historical occupation'}).includes('custom historical occupation'));
  }
});
