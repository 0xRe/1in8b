import test from 'node:test';
import assert from 'node:assert/strict';
import {findFamilyCheckpoint} from './helpers/adult-family-simulation';
import {availableActivities,requestActivity} from '../src/game/engine';
import {decodeSave,encodeSave} from '../src/game/storage';
// Generate the family through game actions; explicitly isolate a financial-hardship boundary.
const checkpoint=()=>{
 const life=findFamilyCheckpoint(l=>l.age>=55&&!l.pendingDecision&&l.family.children.some(c=>c.alive&&c.age>=22),'JPN',24);
 life.stats.savings=0;life.stats.debt=1000;life.stats.investments=0;life.belongings.housingValue=0;life.stats.netAssets=-1000;
 return life;
};
test('a generated family in financial hardship can request one-time help, save its three-year cooldown and avoid annual double-payment',()=>{
 const before=checkpoint();const after=requestActivity(before,'askKids');
 const received=after.events.find(e=>e.key==='event.childHelpReceived')!;const amount=Number(received.params.amount);
 assert.ok(amount>0);assert.ok(Math.abs(after.stats.savings-after.stats.debt-before.stats.savings+before.stats.debt-amount)<.02);
 assert.equal(after.stats.annualIncome,before.stats.annualIncome);
 assert.equal(after.descendants.annualTransfers,before.descendants.annualTransfers);
 assert.equal(after.descendants.totalTransfers,before.descendants.totalTransfers);
 assert.equal(after.pendingDecision,null);
 assert.deepEqual(decodeSave(encodeSave(after,[])).life,after);
 assert.equal(requestActivity(after,'askKids'),after);
 for(const gap of [1,2,3]){const later=structuredClone(after);later.age+=gap;later.year+=gap;later.stats.savings=0;later.stats.debt=0;later.stats.investments=0;later.belongings.housingValue=0;assert.equal(availableActivities(later).includes('askKids'),gap===3);}
});
test('ineligible help requests are inert and forged future or too-frequent cooldown records cannot import',()=>{
 const life=checkpoint();
 for(const mutate of [(l:typeof life)=>l.age=54,(l:typeof life)=>l.justice.prisonUntil=l.age+2,(l:typeof life)=>l.stats.savings=1e12]){
  const invalid=structuredClone(life);mutate(invalid);assert.equal(requestActivity(invalid,'askKids'),invalid);
 }
 const after=requestActivity(life,'askKids');
 for(const id of [`activity-askKids-${after.age+1}`,`activity-askKids-${after.age-1}`]){const bad=structuredClone(after);bad.decisions.push(id);assert.throws(()=>decodeSave(encodeSave(bad,[])));}
});

test('the visible activity follows eligibility and a refused request still consumes cooldown',async()=>{
 const {settleRequestedChildHelp,canAskChildren}=await import('../src/game/child-help-runtime');
 const {default:React}=await import('react');
 const {renderToStaticMarkup}=await import('react-dom/server');
 const {LifeActions}=await import('../src/components/GameDetails');
 const {translator}=await import('../src/lib/i18n');
 const life=checkpoint(),before=structuredClone(life.stats);
 const render=()=>renderToStaticMarkup(React.createElement(LifeActions,{life,t:translator('en'),onChange:()=>{}}));
 assert.match(render(),/Ask adult children for help/);
 const result=settleRequestedChildHelp(life,()=>.999)!;
 assert.equal(result.amount,0);assert.ok(result.declined.length>0);
 assert.equal(life.stats.savings,before.savings);assert.equal(life.stats.debt,before.debt);
 assert.equal(life.stats.happiness,before.happiness-2);
 assert.equal(canAskChildren(life),false);assert.doesNotMatch(render(),/Ask adult children for help/);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});
