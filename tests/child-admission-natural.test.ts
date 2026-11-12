import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {decodeSave,encodeSave} from '../src/game/storage';
test('normal family lives reach early funding and second-year admission without injected state',()=>{
 let early=false,retry=false;
 for(let seed=1;seed<=24&&!(early&&retry);seed++)for(const life of naturalFamily(seed,6,'USA')){
  for(const state of life.descendants.children){
   if(state.admission?.attemptedAge===18&&state.admission.path==='pending')early=true;
   if(state.admission?.attemptedAge===19)retry=true;
  }
  if(life.descendants.children.some(c=>c.admission))assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 }
 assert.ok(early,'no natural age18 funding');assert.ok(retry,'no natural age19 retry');
});
