import test from 'node:test';import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';import {encodeSave,decodeSave} from '../src/game/storage';
test('a higher-support child still at home at adulthood retains a staying plan',()=>{
 let seen=false;
 for(const life of naturalFamily(135,6,'NGA'))for(const child of life.family.children){
  const s=life.descendants.children.find(s=>s.childId===child.id)!;
  if(!child.alive||child.age!==18||(s.birthDevelopment?.developmental?.supportLevel??0)<2||s.residence!=='home'||s.homePlan?.left)continue;
  assert.equal(s.homePlan?.staying,true);assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);seen=true;
 }
 assert.ok(seen,'normal higher-support child must reach adulthood at home');
});
test('an already independent higher-support child is not moved home at adulthood',async()=>{
 const {familyChoice}=await import('./helpers/adult-family-simulation');
 for(const source of naturalFamily(135,6,'NGA')){
  const child=source.family.children.find(c=>c.alive&&c.age===17&&(source.descendants.children.find(s=>s.childId===c.id)?.birthDevelopment?.developmental?.supportLevel??0)>=2);if(!child)continue;
  let life=structuredClone(source);const s=life.descendants.children.find(s=>s.childId===child.id)!;
  s.residence='independent';s.homePlan!.left=true;s.homePlan!.staying=false;
  life=decodeSave(encodeSave(life,[])).life!;
  for(let i=0;i<30&&life.family.children.find(c=>c.id===child.id)!.age<18;i++)life=familyChoice(life);
  const next=life.descendants.children.find(s=>s.childId===child.id)!;
  assert.equal(next.residence,'independent');assert.equal(next.homePlan!.staying,false);assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);return;
 }
 assert.fail('missing adolescent checkpoint');
});
