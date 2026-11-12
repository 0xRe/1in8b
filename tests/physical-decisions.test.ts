import test from 'node:test';import assert from 'node:assert/strict';
import{createNewGame}from'../src/game/new-game';import{DEFAULT_SETTINGS,advanceYear,makeChoice,addReflection}from'../src/game/engine';import{decodeSave,encodeSave}from'../src/game/storage';
const next=(l:any)=>!l.pendingDecision?advanceYear(l):l.pendingDecision.type==='reflection'?addReflection(l,''):makeChoice(l,l.pendingDecision.choices.find((c:any)=>['intensiveCare','attendFollowup','secondaryGo','upperGo','collegeWork'].includes(c.id))?.id??l.pendingDecision.choices[0].id);
test('a naturally unsupported child reaches a real adult equipment choice, pays once and resumes after import',()=>{
 let l=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-26'},303);
 for(let i=0;i<900&&l.alive&&l.age<=18&&!l.pendingDecision?.id.startsWith('physicalAid-');i++)l=next(l);
 assert.equal(l.pendingDecision?.id,'physicalAid-18');assert.equal(l.physicalState!.condition!.childAid!.received,false);assert.equal(l.physicalState!.condition!.aid,false);
 const pending=decodeSave(encodeSave(l,[])).life!;assert.deepEqual(pending,l);
 const price=l.pendingDecision!.choices.find(c=>c.id==='physicalAidGet')!.params.amount as number;const before=l.stats.savings-l.stats.debt;
 const got=makeChoice(l,'physicalAidGet');assert.deepEqual(got,makeChoice(pending,'physicalAidGet'));assert.equal(got.physicalState!.condition!.aid,true);
 assert.ok(Math.abs(got.stats.savings-got.stats.debt-(before-price))<.011);assert.equal((got.physicalState!.condition as any).equipment.attempts.length,1);assert.equal(makeChoice(got,'physicalAidGet'),got);assert.deepEqual(decodeSave(encodeSave(got,[])).life,got);
});
import{physicalAidCost,preparePhysicalEquipment,physicalEquipmentDecision,resolvePhysicalEquipment,physicalSupportFor,payPhysicalSupport}from'../src/game/physical-decisions';
function fixture(){let l=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-26'},303);for(let i=0;i<800&&l.alive&&!(l.age===20&&l.timeline?.complete&&!l.pendingDecision);i++){if(l.pendingDecision?.id.startsWith('physicalAid-'))l=makeChoice(l,'physicalAidDecline');else l=next(l);}assert.equal(l.age,20);const c=l.physicalState!.condition!;assert.equal(c.childAid!.received,false);c.aid=false;delete(c as any).equipment;l.decisions=l.decisions.filter(id=>!id.startsWith('physicalAid-'));l.stats.savings=0;l.stats.debt=0;l.stats.investments=1000;l.stats.happiness=50;l.stats.netAssets=l.stats.investments+l.belongings.housingValue;return l;}
test('equipment cost uses source price level, coverage fallback and difficult access rather than hobby credit rules',()=>{
 const l=fixture();l.country={...l.country,ppp:1500,oop:50};l.physicalState!.condition!.kind='mobility';assert.equal(physicalAidCost(l),8181.82);
 l.physicalState!.condition!.kind='vision';assert.equal(physicalAidCost(l),4090.91);l.physicalState!.condition!.kind='hearing';assert.equal(physicalAidCost(l),17045.45);
 l.country.oop=0;assert.equal(physicalAidCost(l),10227.27);
});
test('adult aid can borrow signed money, keeps investments and rejects repeated or invalid resolution',()=>{
 const l=fixture();preparePhysicalEquipment(l);l.pendingDecision=physicalEquipmentDecision(l);assert.ok(l.pendingDecision);const price=physicalAidCost(l),before=structuredClone(l),got=makeChoice(l,'physicalAidGet');
 assert.deepEqual(l,before);assert.equal(got.stats.investments,1000);assert.equal(got.stats.savings,0);assert.equal(got.stats.debt,price);assert.equal(got.stats.happiness,54);assert.equal(got.physicalState!.condition!.aid,true);assert.equal(makeChoice(got,'physicalAidGet'),got);assert.deepEqual(decodeSave(encodeSave(got,[])).life,got);
 assert.equal(resolvePhysicalEquipment(l,'not-an-action'),null);assert.deepEqual(l,before);
});
test('two ordinary inquiries are eight years apart, with one funded follow-up only after a previously poor refusal',()=>{
 const l=fixture(),c=l.physicalState!.condition as any;preparePhysicalEquipment(l);assert.equal(c.equipment.offer.poorAtOffer,true);assert.equal(resolvePhysicalEquipment(l,'physicalAidDecline'),'declined');
 l.age=27;l.year=l.birthYear+27;preparePhysicalEquipment(l);assert.equal(c.equipment.offer,undefined);
 l.age=28;l.year++;preparePhysicalEquipment(l);assert.equal(c.equipment.offer.age,28);assert.equal(resolvePhysicalEquipment(l,'physicalAidDecline'),'declined');
 const cost=physicalAidCost(l);l.age=29;l.year++;l.stats.savings=3*cost;preparePhysicalEquipment(l);assert.equal(c.equipment.offer,undefined);
 l.age=30;l.year++;l.stats.savings=3*cost-.01;preparePhysicalEquipment(l);assert.equal(c.equipment.offer,undefined);
 l.stats.savings=3*cost;preparePhysicalEquipment(l);assert.equal(c.equipment.offer.age,30);resolvePhysicalEquipment(l,'physicalAidDecline');l.age=40;l.year=l.birthYear+40;preparePhysicalEquipment(l);assert.equal(c.equipment.offer,undefined);assert.equal(c.equipment.attempts.length,3);
});
test('an adequately funded second refusal does not create an endless series of later inquiries',()=>{
 const l=fixture(),c=l.physicalState!.condition as any;l.stats.savings=1e6;preparePhysicalEquipment(l);resolvePhysicalEquipment(l,'physicalAidDecline');l.age=28;l.year=l.birthYear+28;preparePhysicalEquipment(l);assert.equal(c.equipment.offer.poorAtOffer,false);resolvePhysicalEquipment(l,'physicalAidDecline');l.age=40;l.year=l.birthYear+40;preparePhysicalEquipment(l);assert.equal(c.equipment.offer,undefined);
});
test('annual support uses median income, reduces debt once and stays distinct from salary and invested savings',()=>{
 const l=fixture();l.country={...l.country,ppp:10000,gi:.22,region:'hi'};l.stats.employment='unemployed';l.stats.job='none';l.stats.debt=2000;
 assert.equal(physicalSupportFor(l),1498.41);const salary=l.stats.annualIncome;assert.equal(payPhysicalSupport(l),1498.41);assert.equal(l.stats.savings,0);assert.ok(Math.abs(l.stats.debt-501.59)<1e-9);assert.equal(l.stats.investments,1000);assert.equal(l.stats.annualIncome,salary);assert.equal(payPhysicalSupport(l),0);
 const aid=l.physicalState!.condition as any;preparePhysicalEquipment(l);assert.equal(aid.equipment.offer.poorAtOffer,true);
});
test('support and equipment honor actual recognition, adulthood, work, school, custody and regional context',()=>{
 for(const change of[(l:any)=>delete l.physicalState,(l:any)=>delete l.physicalState.condition.recognizedAge,(l:any)=>l.age=17,(l:any)=>l.alive=false,(l:any)=>l.justice.prisonUntil=22]){
  const l=fixture();change(l);preparePhysicalEquipment(l);assert.equal(physicalEquipmentDecision(l),null);assert.equal(physicalSupportFor(l),0);
 }
 for(const change of[(l:any)=>l.stats.employment='employed',(l:any)=>l.schooling.enrolled=true,(l:any)=>l.age=65,(l:any)=>l.country.region='ssa']){
  const l=fixture();l.stats.employment='unemployed';l.stats.job='none';change(l);assert.equal(physicalSupportFor(l),0);
 }
 const retired=fixture();retired.age=65;retired.year=retired.birthYear+65;preparePhysicalEquipment(retired);assert.ok(physicalEquipmentDecision(retired),'equipment access continues after retirement');
});
test('a pending equipment price cannot be forged, and a debit beyond the canonical bound is not accepted',()=>{
 const l=fixture();preparePhysicalEquipment(l);l.pendingDecision=physicalEquipmentDecision(l);assert.ok(l.pendingDecision);const bad=structuredClone(l);bad.pendingDecision!.choices[0].params.amount=0;assert.throws(()=>decodeSave(encodeSave(bad,[])));
 const capped=fixture();capped.stats.debt=1e12;preparePhysicalEquipment(capped);const menu=physicalEquipmentDecision(capped);assert.ok(menu);assert.equal(menu.choices.some(c=>c.id==='physicalAidGet'),false);assert.equal(resolvePhysicalEquipment(capped,'physicalAidGet'),null);
});

test('the annual inquiry snapshots funds before support, and a saved support receipt cannot pay the same year twice',()=>{
 const l=fixture();l.physicalState!.lastCheckedAge=19;l.stats.employment='unemployed';l.stats.job='none';l.stats.savings=3*physicalAidCost(l)-1;
 const amount=l.stats.savings;const out=observePhysicalYear(l,()=>assert.fail('no repeated child draw'));
 assert.equal(out,'event.physical.support');assert.equal((l.physicalState!.condition as any).equipment.offer.poorAtOffer,true);assert.ok(l.stats.savings>amount+1);
 assert.equal(observePhysicalYear(l,()=>assert.fail('year resumes')),null);assert.equal(payPhysicalSupport(l),0);
 l.stats.netAssets=l.stats.savings+l.stats.investments+l.belongings.housingValue-l.stats.debt;const recorded=structuredClone(l.physicalState!.support);const restored=decodeSave(encodeSave(l,[])).life!;assert.deepEqual(restored.physicalState!.support,recorded);assert.equal(payPhysicalSupport(restored),0);
});
import {observePhysicalYear} from '../src/game/physical-runtime';
test('actual year completion credits support once, keeps salary unchanged and never adds it to projected savings again',()=>{
 let l=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-26'},230);
 for(let i=0;i<800&&!(l.age===20&&l.timeline?.complete&&!l.pendingDecision);i++)l=next(l);
 assert.equal(l.age,20);assert.equal(l.physicalState!.condition!.aid,true);
 l.stats.savings=100000;l.stats.debt=0;l.stats.investments=0;l.stats.annualIncome=0;l.stats.job='none';l.stats.employment='none';l.stats.netAssets=100000+l.belongings.housingValue;
 l.care.who='self';l.care.until=23;l.care.previousIncome=0;l.care.previousJob='none';const plain=structuredClone(l);delete plain.physicalState;
 const finish=(initial:typeof l)=>{let out=initial;for(let i=0;i<300&&!(out.age===21&&out.timeline?.complete&&!out.pendingDecision);i++)out=next(out);assert.equal(out.age,21);return out;};
 const partial=advanceYear(l,.01);assert.equal(partial.age,21);assert.equal(partial.timeline!.complete,false);const restored=decodeSave(encodeSave(partial,[])).life!;assert.deepEqual(next(restored),next(partial));
 const paid=finish(partial),without=finish(advanceYear(plain,.01));assert.equal(paid.physicalState!.support!.amount,6475.74);
 assert.ok(Math.abs((paid.stats.savings-paid.stats.debt)-(without.stats.savings-without.stats.debt)-6527.55)<.011);assert.equal(paid.budget.income,without.budget.income);assert.equal(paid.stats.annualIncome,0);
 assert.equal(paid.events.filter(e=>e.age===21&&e.key==='event.physical.support').length,1);assert.deepEqual(decodeSave(encodeSave(paid,[])).life,paid);
});
test('support receipts record only representable cash and malformed equipment history cannot invent aid',()=>{
 const l=fixture();l.stats.employment='unemployed';l.stats.job='none';l.stats.savings=1e12-.01;assert.equal(payPhysicalSupport(l),.01);assert.equal(l.stats.savings,1e12);assert.equal(l.physicalState!.support!.amount,.01);
 const normal=fixture();preparePhysicalEquipment(normal);normal.pendingDecision=physicalEquipmentDecision(normal);const got=makeChoice(normal,'physicalAidGet');
 for(const mutate of[(b:any)=>b.physicalState.condition.equipment.attempts[0].age=17,(b:any)=>b.physicalState.condition.equipment.attempts[0].cost=0,(b:any)=>b.physicalState.condition.equipment.attempts[0].action='skip',(b:any)=>b.physicalState.condition.equipment.attempts.push({...b.physicalState.condition.equipment.attempts[0],age:20}),(b:any)=>b.physicalState.condition.aid=false,(b:any)=>b.decisions=b.decisions.filter((id:string)=>!id.startsWith('physicalAid-'))]){
  const bad=structuredClone(got);mutate(bad);assert.throws(()=>decodeSave(encodeSave(bad,[])));
 }
});
test('committed canonical seeking and homemaker identities retain the original support eligibility',()=>{
 for(const [job,employment]of[['seeking','unemployed'],['homemaker','none']]as const){const l=fixture();l.stats.job=job as any;l.stats.employment=employment;assert.equal(physicalSupportFor(l),6475.74);}
});
