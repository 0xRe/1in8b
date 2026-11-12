import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily,familyChoice} from './helpers/adult-family-simulation';
import {makeChoice} from '../src/game/engine';
import {descendantSubject,resolveDescendantDecision} from '../src/game/descendants';
import {encodeSave,decodeSave} from '../src/game/storage';
function fixture(seed=124){
 const life=[...naturalFamily(seed)].find(l=>l.pendingDecision?.id.startsWith('descendant-wedding-child-'))!;
 if(!life)return null;
 const id=life.pendingDecision!.id.slice('descendant-wedding-'.length);
 const {person,state}=descendantSubject(life,id)!;
 person.country='USA';state.residence='independent';
 state.unionPlan={version:1,observedYear:life.year,orientation:'sameSex',sameSexPartner:true,cohabitationAge:null,cohabitationYear:null,fertilityTarget:9};
 return {life,id,person,state};
}
for(const sex of ['F','M'] as const) test(`${sex}: wedding respects saved same-sex pairing and continued family remains saveable`,()=>{
 let births=0;
 for(const seed of [124,...Array.from({length:24},(_,i)=>i+1)]){
 if(births)break;
 const sample=fixture(seed);if(!sample)continue;
 const {life,id,person}=sample; person.sex=sex;
 let after=makeChoice(life,'modestWedding');
 assert.equal(descendantSubject(after,id)!.state.spouse!.sex,person.sex);
 after=decodeSave(encodeSave(after,[])).life!;
 for(let step=0;step<250&&after.alive&&after.age<85;step++){
  // Keep the audited USA formation route available instead of migrating to Kenya.
  after=after.pendingDecision?.id===`descendant-migration-${id}`?makeChoice(after,'childStay'):familyChoice(after);
  for(const baby of after.descendants.grandchildren.filter(g=>g.parentId===id)){
   assert.notEqual(baby.origin?.method,'natural');
   if(baby.origin?.method==='adoption')assert.ok(!baby.earlyLoss);
   births++;
  }
  after=decodeSave(encodeSave(after,[])).life!;
 }
 }
 assert.ok(births>0,'exercise actual same-sex parent formation across bounded real-game seeds');
});
test('unavailable same-sex marriage is rejected before charging',()=>{
 const {life,person}=fixture()!;person.country='NGA';
 const before=structuredClone(life);
 assert.equal(resolveDescendantDecision(life,'modestWedding',{event:()=>{throw Error('event');},name:()=>{throw Error('name');},mortality:()=>0}),false);
 assert.deepEqual(life,before);
});
