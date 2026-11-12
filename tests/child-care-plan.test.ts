import test from 'node:test';import assert from 'node:assert/strict';
import {resolveChildCarePlan} from '../src/game/child-care-plan';
const c={parentAge:60,parentHealth:80,year:2086,rich:true};
const sibling={id:'s1',name:'Alex',birthYear:2050,alive:true,age:36,developmental:false,away:false,abroad:false,placed:false,cutOff:false,imprisoned:false,near:true,city:false};
test('care planning waits until60 or unhealthy50 and draws once for the annual chance',()=>{
 for(const patch of [{parentAge:49,parentHealth:10},{parentAge:59,parentHealth:35}])assert.equal(resolveChildCarePlan(null,{...c,...patch},[],()=>{throw Error('ineligible');}),null);
 assert.equal(resolveChildCarePlan(null,c,[],()=>.2),null);
 assert.deepEqual(resolveChildCarePlan(null,{...c,parentAge:50,parentHealth:34},[],()=>0),{kind:'groupHome',year:2086,parentAge:50});
});
test('sibling selection prefers nearby siblings then the oldest and preserves input order',()=>{
 const rows=[{...sibling,id:'far',near:false,city:true,birthYear:2030},{...sibling,id:'young',birthYear:2055},sibling];
 const original=structuredClone(rows);let draws=0;
 assert.deepEqual(resolveChildCarePlan(null,c,rows,()=>{draws++;return 0;}),{kind:'sibling',year:2086,parentAge:60,siblingId:'s1',siblingName:'Alex',siblingBirthYear:2050});
 assert.equal(draws,2);assert.deepEqual(rows,original);
});
test('ineligible siblings never become carers and resource access chooses the fallback',()=>{
 for(const patch of [{alive:false},{age:21},{developmental:true},{away:true},{abroad:true},{placed:true},{cutOff:true},{imprisoned:true},{near:false,city:false}]){
  let draws=0;assert.equal(resolveChildCarePlan(null,{...c,rich:false},[{...sibling,...patch}],()=>{draws++;return 0;})?.kind,'relatives');assert.equal(draws,1);
 }
 for(const [rich,threshold] of [[true,.45],[false,.7]] as const){let n=0;assert.equal(resolveChildCarePlan(null,{...c,rich},[sibling],()=>n++?threshold:0)?.kind,rich?'groupHome':'relatives');}
});
test('existing care plans stay stable, but a deceased or mismatched sibling invalidates the plan',()=>{
 const plan={kind:'sibling' as const,year:2080,parentAge:54,siblingId:'s1',siblingName:'Alex',siblingBirthYear:2050};
 assert.equal(resolveChildCarePlan(plan,c,[{...sibling,abroad:true}],()=>{throw Error('retained');}),plan);
 assert.equal(resolveChildCarePlan(plan,c,[{...sibling,alive:false}],()=>.9),null);
 assert.equal(resolveChildCarePlan(plan,c,[{...sibling,name:'Other'}],()=>.9),null);
 assert.equal(resolveChildCarePlan({kind:'relatives',year:2080,parentAge:54},c,[],()=>{throw Error('retained');})?.kind,'relatives');
});

test('a natural family reaches a future care plan and retains it in saves',async()=>{
 const {naturalFamily}=await import('./helpers/adult-family-simulation');const {encodeSave,decodeSave}=await import('../src/game/storage');let found=false;
 for(const life of naturalFamily(135,6,'NGA')){
  assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
  if(life.descendants.children.some(s=>s.carePlan)){found=true;break;}
 }
 assert.ok(found,'care planning must be reachable through public actions');
});

test('a saved care plan is visible and replay neither moves households nor rewards twice',async()=>{
 const {naturalFamily}=await import('./helpers/adult-family-simulation');const {childCarePlanYear}=await import('../src/game/child-care-plan');
 const React=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');const {FamilyDescendants}=await import('../src/components/FamilyDescendants');const {translator}=await import('../src/lib/i18n');
 for(const life of naturalFamily(135,6,'NGA')){
  const state=life.descendants.children.find(s=>s.carePlan);if(!state)continue;
  const before=structuredClone(life),events:string[]=[];
  childCarePlanYear(life,key=>events.push(key),()=>.99);
  assert.equal(life.stats.happiness,before.stats.happiness);assert.deepEqual(life.descendants.children,before.descendants.children);assert.equal(events.length,0);
  const html=renderToStaticMarkup(React.createElement(FamilyDescendants,{life,locale:'en',t:translator('en')}));
  assert.ok(html.includes('Future care:'));return;
 }
 assert.fail('missing natural plan');
});

test('care-plan import rejects impossible dates and self or unknown carers',async()=>{
 const {naturalFamily}=await import('./helpers/adult-family-simulation');const {encodeSave,decodeSave}=await import('../src/game/storage');
 for(const life of naturalFamily(135,6,'NGA')){
  const state=life.descendants.children.find(s=>s.carePlan);if(!state)continue;
  const child=life.family.children.find(c=>c.id===state.childId)!;
  for(const plan of [{...state.carePlan,parentAge:49},{...state.carePlan,year:life.year+1},{kind:'sibling',year:life.year,parentAge:life.age,siblingId:child.id,siblingName:child.name,siblingBirthYear:child.birthYear},{kind:'sibling',year:life.year,parentAge:life.age,siblingId:'unknown',siblingName:'Unknown',siblingBirthYear:2050}]){
   const bad=structuredClone(life);bad.descendants.children.find(s=>s.childId===state.childId)!.carePlan=plan as any;
   assert.throws(()=>decodeSave(encodeSave(bad,[])));
  }
  return;
 }
 assert.fail('missing natural care plan');
});
