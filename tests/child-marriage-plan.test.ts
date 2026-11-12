import test from 'node:test';
import assert from 'node:assert/strict';
import {drawChildMarriageAge,childMarriageBaseline} from '../src/game/child-union';
import {getCountryById} from '../src/game/countries';
test('source marriage planning includes no planned wedding and consumes only its probability draw',()=>{
 const country=getCountryById('USA')!;let draws=0;
 assert.equal(drawChildMarriageAge(country,'F',undefined,()=>{draws++;return .8;}),null);
 assert.equal(draws,1);
});
test('source wedding timing uses the sex-specific baseline and two centered timing draws',()=>{
 const country=getCountryById('USA')!;
 for(const sex of ['F','M'] as const){const values=[.1,.5,.5];let draws=0;
 assert.equal(drawChildMarriageAge(country,sex,undefined,()=>values[draws++]),Math.round(childMarriageBaseline(country,sex)+(sex==='M'?.5:0)));
 assert.equal(draws,3);
 }
});

import {naturalFamily} from './helpers/adult-family-simulation';
import {encodeSave,decodeSave} from '../src/game/storage';
test('newborn children can naturally retain an unmarried plan through save restoration',()=>{
 let found=false;
 for(let seed=1;seed<=12&&!found;seed++)for(const life of naturalFamily(seed,6,'USA')){
  const state=life.descendants.children.find(c=>c.weddingAt===null);
  if(state){assert.ok(state.unionPlan);assert.equal(decodeSave(encodeSave(life,[])).life!.descendants.children.find(c=>c.childId===state.childId)!.weddingAt,null);found=true;break;}
 }
 assert.ok(found,'actual new lives must be able to generate no planned wedding');
});

test('natural unmarried plans produce cohabiting births without injected union or fertility state',()=>{
 let births=0;
 for(let seed=1;seed<=20;seed++){
  const life=[...naturalFamily(seed,6,'USA')].at(-1)!;
  const children=life.descendants.grandchildren.filter(g=>g.origin?.union==='cohabiting');
  births+=children.length;
  const restored=decodeSave(encodeSave(life,[])).life!;
  assert.deepEqual(restored.descendants.grandchildren.filter(g=>g.origin?.union==='cohabiting'),children);
 }
 assert.ok(births>0,'normal gameplay must reach cohabiting family births');
});
