import test from 'node:test';
import assert from 'node:assert/strict';
import {EN,LOCALES,catalogs,translator} from '../src/lib/i18n';
const keys=['event.greatGrandchildrenBorn','event.greatGreatGrandchildrenBorn','family.greatGrandchildren','family.greatGreatGrandchildren','family.greatGrandchildrenAlive','family.greatGreatGrandchildrenAlive','bio.extraGreatGreat','event.greatGrandchildrenFirst','event.greatGreatGrandchildrenFirst','family.earlyLoss','event.descendantEarlyLoss','event.descendantBirthBatch','family.motherHome','family.formation.adoption','family.formation.donor','family.formation.surrogacy','event.descendantDisclosureSame','event.descendantDisclosureBi','event.descendantCohabitation','family.cohabitationStarted','event.descendantCohabitingBirth','event.descendantSoloBirth'];
test('all completed family features translate explicitly with matching placeholders',()=>{
 const fields=(s:string)=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
 for(const {code} of LOCALES)for(const key of keys){
  assert.ok(Object.hasOwn(catalogs[code],key),`${code}.${key}`);
  assert.deepEqual(fields(catalogs[code][key]),fields(EN[key]),`${code}.${key}`);
  if(code!=='en')assert.notEqual(catalogs[code][key],EN[key]);
  const params={name:'Alex <&>',parent:'Sam',baby:'Robin',count:2,total:7,year:2079};
  const result=translator(code)(key,params);
  assert.ok(!/\{\w+\}/.test(result),`${code}.${key}`);
  if(fields(EN[key]).includes('name'))assert.ok(result.includes(params.name));
 }
});
