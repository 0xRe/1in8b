import test from 'node:test';
import assert from 'node:assert/strict';
import {findFamilyCheckpoint} from './helpers/adult-family-simulation';
import {observeGuardianLoss,guardianDecision,resolveGuardianDecision,guardianYear,guardianAnnualCost,guardianHome} from '../src/game/grandchild-guardianship-runtime';
const fixture=()=>{
 const life=findFamilyCheckpoint(l=>!l.pendingDecision&&l.descendants.grandchildren.some(g=>g.alive&&g.age<17));
 const childId=life.descendants.grandchildren.find(g=>g.alive&&g.age<17)!.parentId;
 const child=life.family.children.find(c=>c.id===childId)!;
 const state=life.descendants.children.find(s=>s.childId===childId)!;
 // Isolate an observed sole-parent death boundary; this is not a natural solo-birth claim.
 state.marriedYear=null;state.spouse=null;delete state.weddingHome;
 if(state.unionPlan)state.unionPlan.cohabitationYear=null;
 for(const g of life.descendants.grandchildren.filter(g=>g.parentId===childId))g.origin={method:'natural',union:'solo',country:g.country,household:'parent'};
 child.alive=false;child.deathAge=child.age;
 return {life,child};
};
test('observed death queues one care offer; home placement preserves lineage and charges the distinct annual cost',()=>{
 const {life,child}=fixture(),before=structuredClone(life.stats);
 observeGuardianLoss(life,child.id);
 const offer=guardianDecision(life)!;assert.ok(offer);assert.ok(offer.choices.some(c=>c.id==='guardianHome'));
 life.pendingDecision=offer;
 assert.equal(resolveGuardianDecision(life,'guardianHome'),true);
 const wards=life.descendants.grandchildren.filter(g=>guardianHome(life,g.id));
 assert.ok(wards.length);assert.ok(wards.every(g=>g.parentId===child.id));
 assert.equal(life.stats.happiness,before.happiness-3);assert.equal(life.stats.social,before.social+3);assert.equal(life.stats.health,before.health-2);
 assert.ok(guardianAnnualCost(life)>0);
 assert.equal(resolveGuardianDecision(life,'guardianHome'),false);
 assert.equal(guardianDecision(life),null);
});
test('stale home choices cannot bypass current health; kin commitment expires and home departures happen once',()=>{
 const {life,child}=fixture();observeGuardianLoss(life,child.id);life.pendingDecision=guardianDecision(life);
 life.stats.health=34;assert.equal(resolveGuardianDecision(life,'guardianHome'),false);
 assert.equal(resolveGuardianDecision(life,'guardianKin'),true);
 const funding=life.descendants.guardianship!.records.at(-1)!;
 assert.ok(guardianAnnualCost(life)>0);life.year=funding.untilYear!;assert.equal(guardianAnnualCost(life),0);
 const second=fixture();observeGuardianLoss(second.life,second.child.id);second.life.pendingDecision=guardianDecision(second.life);resolveGuardianDecision(second.life,'guardianHome');
 const ward=second.life.descendants.grandchildren.find(g=>guardianHome(second.life,g.id))!;ward.age=19;
 const before=second.life.stats.happiness;const events:string[]=[];
 guardianYear(second.life,key=>events.push(key));assert.equal(guardianHome(second.life,ward.id),false);assert.equal(ward.residence,'independent');assert.equal(second.life.stats.happiness,before+3);
 guardianYear(second.life,key=>events.push(key));assert.equal(events.length,1);
});
test('married-parent loss does not offer replacement care and legacy dead parents are not discovered implicitly',()=>{
 const {life,child}=fixture();assert.equal(guardianDecision(life),null);
 life.descendants.children.find(s=>s.childId===child.id)!.marriedYear=life.year-2;
 observeGuardianLoss(life,child.id);assert.equal(guardianDecision(life),null);
});

test('public actions restore a pending care decision and reject forged care receipts',async()=>{
 const {advanceYear,makeChoice}=await import('../src/game/engine');
 const {decodeSave,encodeSave}=await import('../src/game/storage');
 const {life,child}=fixture();observeGuardianLoss(life,child.id);
 const offered=advanceYear(life,.1);
 assert.equal(offered.pendingDecision?.id,`guardian-${child.id}`);
 const restored=decodeSave(encodeSave(offered,[])).life!;
 const after=makeChoice(restored,'guardianHome');
 assert.equal(after.pendingDecision,null);assert.ok(after.descendants.guardianship!.records.length);
 assert.deepEqual(decodeSave(encodeSave(after,[])).life,after);
 for(const alter of [(r:any)=>r.year=after.year+1,(r:any)=>r.childIds=['missing'],(r:any)=>r.choice='random',(r:any)=>r.health=34]){
  const bad=structuredClone(after);alter(bad.descendants.guardianship!.records[0]);assert.throws(()=>encodeSave(bad,[]));
 }
});

test('care placement changes the rendered household and budget without duplicating generic dependents',async()=>{
 const {advanceYear,makeChoice}=await import('../src/game/engine');
 const React=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');
 const {FamilyDescendants}=await import('../src/components/FamilyDescendants');const {translator}=await import('../src/lib/i18n');
 const {life,child}=fixture();observeGuardianLoss(life,child.id);
 const offer=advanceYear(life,.1),home=makeChoice(offer,'guardianHome'),other=makeChoice(offer,'guardianOther');
 assert.ok(Math.abs(home.budget.dependents-other.budget.dependents-guardianAnnualCost(home))<.02);
 assert.equal(home.stats.savings,other.stats.savings,'choosing care does not immediately charge an annual bill');
 const html=renderToStaticMarkup(React.createElement(FamilyDescendants,{life:home,locale:'en',t:translator('en')}));
 assert.match(html,/In your care/);
});

test('pending choices and kin expiry reject tampering, preserve key-order-independent saves, and keep legacy absence',async()=>{
 const {advanceYear,makeChoice}=await import('../src/game/engine');const {decodeSave,encodeSave}=await import('../src/game/storage');
 const {life,child}=fixture();observeGuardianLoss(life,child.id);const offer=advanceYear(life,.1);
 const reordered=structuredClone(offer);reordered.pendingDecision=Object.fromEntries(Object.entries(reordered.pendingDecision!).reverse()) as typeof reordered.pendingDecision;
 assert.ok(decodeSave(encodeSave(reordered,[])).life);
 const wrong=structuredClone(offer);wrong.pendingDecision!.choices[0].params.amount=1;assert.throws(()=>encodeSave(wrong,[]));
 const kin=makeChoice(offer,'guardianKin');assert.deepEqual(decodeSave(encodeSave(kin,[])).life,kin);
 kin.descendants.guardianship!.records[0].untilYear!++;assert.throws(()=>encodeSave(kin,[]));
 const legacy=findFamilyCheckpoint(l=>!l.pendingDecision&&l.descendants.grandchildren.length>0);
 assert.equal(decodeSave(encodeSave(legacy,[])).life!.descendants.guardianship,undefined);
});

test('the real annual death hook records care without discovering unrelated historical deaths',async()=>{
 const {advanceYear,makeChoice,addReflection}=await import('../src/game/engine');
 const {decodeSave,encodeSave}=await import('../src/game/storage');
 const base=fixture();base.child.alive=true;base.child.deathAge=null;
 delete base.life.timeline;base.life.pendingDecision=null;
 let observed=false;
 for(let rng=1;rng<=5000&&!observed;rng++){
  let life=structuredClone(base.life);life.rng=rng;
  for(let step=0;step<30&&life.alive&&life.year===base.life.year;step++){
   if(life.pendingDecision)life=life.pendingDecision.type==='reflection'?addReflection(life,''):makeChoice(life,life.pendingDecision.choices.at(-1)!.id);
   else life=advanceYear(life);
  }
  const parent=life.family.children.find(c=>c.id===base.child.id)!;
  if(parent.alive||!life.alive)continue;
  assert.equal(life.descendants.guardianship?.pending?.parentId,parent.id);
  assert.equal(life.descendants.guardianship!.pending!.year,life.year);
  assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
  observed=true;
 }
 assert.ok(observed,'bounded deterministic annual runs did not observe the target death');
});

test('home and kin care survive complete public-action lifetimes with deterministic saves and expiry',async()=>{
 const {advanceYear,makeChoice}=await import('../src/game/engine');const {familyChoice}=await import('./helpers/adult-family-simulation');
 const {decodeSave,encodeSave}=await import('../src/game/storage');
 for(const choice of ['guardianHome','guardianKin']){
  const base=fixture();observeGuardianLoss(base.life,base.child.id);
  let life=makeChoice(advanceYear(base.life,.1),choice),seenExpiry=false;
  const original=structuredClone(life.descendants.guardianship!.records[0]);
  for(let step=0;step<500&&life.alive;step++){
   const restored=decodeSave(encodeSave(life,[])).life!;
   const next=familyChoice(life);assert.deepEqual(next,familyChoice(restored));life=next;
   if(choice==='guardianKin'&&life.year>=original.untilYear!){
    seenExpiry=true;
    if(life.descendants.guardianship!.records.filter(r=>r.choice==='kin').at(-1)?.parentId===original.parentId)assert.equal(guardianAnnualCost(life),0);
   }
   if(choice==='guardianHome'&&life.descendants.guardianship!.departed.length){
    seenExpiry=true;
    for(const id of life.descendants.guardianship!.departed)assert.equal(guardianHome(life,id),false);
   }
  }
  assert.equal(life.alive,false);assert.ok(seenExpiry,`${choice} expiry was not exercised`);
  assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
  assert.deepEqual(life.descendants.guardianship!.records[0],original);
 }
});

test('single-grandchild wording is grammatical and previously saved singular offers remain importable',async()=>{
 const {advanceYear}=await import('../src/game/engine');const {decodeSave,encodeSave}=await import('../src/game/storage');
 const {translator}=await import('../src/lib/i18n');
 const {life,child}=fixture();observeGuardianLoss(life,child.id);const offer=advanceYear(life,.1);
 assert.equal(offer.pendingDecision!.params.count,1);
 assert.match(translator('en')(offer.pendingDecision!.key,offer.pendingDecision!.params),/one young grandchild\./);
 const legacy=structuredClone(offer);legacy.pendingDecision!.key='decision.guardian';
 assert.equal(decodeSave(encodeSave(legacy,[])).life!.pendingDecision!.key,'decision.guardianOne');
});

test('kin funding reaches annual cash settlement exactly once, rather than only changing the budget preview',async()=>{
 const {advanceYear,makeChoice}=await import('../src/game/engine');
 const {familyChoice}=await import('./helpers/adult-family-simulation');
 const {decodeSave,encodeSave}=await import('../src/game/storage');
 const base=fixture();observeGuardianLoss(base.life,base.child.id);
 const offer=advanceYear(base.life,.1);
 let kin=makeChoice(offer,'guardianKin'),other=makeChoice(offer,'guardianOther');
 const wealth=(life:typeof kin)=>life.stats.savings+life.stats.investments-life.stats.debt;
 assert.equal(wealth(kin),wealth(other));
 let settled=false;
 for(let step=0;step<100;step++){
  kin=familyChoice(kin);other=familyChoice(other);
  assert.equal(kin.age,other.age);assert.equal(kin.rng,other.rng);
  assert.equal(kin.alive,other.alive);assert.ok(kin.alive);
  assert.deepEqual(decodeSave(encodeSave(kin,[])).life,kin);
  if(kin.timeline?.complete){
   const cost=Math.round(guardianAnnualCost(kin)*100)/100;
   assert.ok(cost>0);
   assert.ok(Math.abs(other.budget.annualSavings-kin.budget.annualSavings-cost)<.03);
   assert.ok(Math.abs(wealth(other)-wealth(kin)-cost)<.03,`cash difference ${wealth(other)-wealth(kin)} must equal one annual charge ${cost}`);
   settled=true;break;
  }
 }
 assert.ok(settled,'must reach the next annual settlement');
});
