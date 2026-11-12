import test from 'node:test';import assert from 'node:assert/strict';
import {childSupportedWork} from '../src/game/child-supported-work';
const rich={level:2,ppp:50000,region:'hi',urban:true};
test('level three uses day activities without consuming a random draw; ordinary children are untouched',()=>{
 assert.equal(childSupportedWork({...rich,level:3},()=>{throw Error('no draw');}),'dayActivities');
 assert.equal(childSupportedWork({...rich,level:1},()=>{throw Error('no draw');}),null);
});
test('rich level-two support selects sheltered work at25 percent',()=>{
 assert.equal(childSupportedWork(rich,()=>.249),'shelteredWork');
 assert.equal(childSupportedWork(rich,()=>.25),'dayActivities');
 assert.equal(childSupportedWork({...rich,region:'eca',ppp:15000},()=>0),'shelteredWork');
});
test('outside the rich threshold, family work depends on actual child residence and27 percent draw',()=>{
 for(const c of [{...rich,ppp:14999},{...rich,region:'ssa'}]){
  assert.equal(childSupportedWork(c,()=>.269),'familyShop');
  assert.equal(childSupportedWork({...c,urban:false},()=>.269),'familyFarm');
  assert.equal(childSupportedWork(c,()=>.27),'dayActivities');
 }
});

test('work residence is resolved once from the child country and parent residence',async()=>{
 const {childWorkResidence}=await import('../src/game/child-supported-work');
 const base={abroad:false,parentUrban:false,countryUrban:50,university:false};
 assert.equal(childWorkResidence({...base,abroad:true},()=>{throw Error('abroad draw');}),true);
 assert.equal(childWorkResidence({...base,parentUrban:true},()=>.899),true);
 assert.equal(childWorkResidence({...base,parentUrban:true},()=>.9),false);
 assert.equal(childWorkResidence(base,()=>.349),true);
 assert.equal(childWorkResidence(base,()=>.35),false);
 assert.equal(childWorkResidence({...base,university:true},()=>.599),true);
 assert.equal(childWorkResidence({...base,countryUrban:0},()=>.099),true);
 assert.equal(childWorkResidence({...base,countryUrban:100,university:true},()=>.9),false);
});

test('normal higher-support children enter recorded adult support instead of the ordinary job pool',async()=>{
 const {naturalFamily}=await import('./helpers/adult-family-simulation');
 const {decodeSave,encodeSave}=await import('../src/game/storage');let seen=false;
 for(const life of naturalFamily(135,6,'NGA')){
  const s=life.descendants.children.find(s=>s.birthDevelopment?.developmental?.supportLevel===2&&life.family.children.find(c=>c.id===s.childId)!.age===20);
  if(!s)continue;
  assert.ok(s.supportedWork,'adult support receipt');
  assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);seen=true;break;
 }
 assert.ok(seen);
});


test('supported adult lifecycle retains its receipt and never invents ordinary wages',async()=>{
 const {naturalFamily}=await import('./helpers/adult-family-simulation');
 const {decodeSave,encodeSave}=await import('../src/game/storage');
 const receipts=new Map<string,unknown>();let years=0;
 for(const life of naturalFamily(135,6,'NGA')){
  assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
  for(const s of life.descendants.children){if(!s.supportedWork)continue;
   if(receipts.has(s.childId))assert.deepEqual(s.supportedWork,receipts.get(s.childId));else receipts.set(s.childId,structuredClone(s.supportedWork));
   assert.equal(s.income,0);years++;
  }
 }
 assert.ok(years>10,'must verify multiple adult years');
});

test('support receipt rejects a forged ordinary job on import',async()=>{
 const {naturalFamily}=await import('./helpers/adult-family-simulation');const {decodeSave,encodeSave}=await import('../src/game/storage');
 for(const life of naturalFamily(135,6,'NGA')){
  const s=life.descendants.children.find(s=>s.supportedWork);if(!s)continue;
  const changed=structuredClone(life);changed.family.children.find(c=>c.id===s.childId)!.job='engineer';
  assert.throws(()=>decodeSave(encodeSave(changed,[])));return;
 }
 assert.fail('missing natural support receipt');
});

test('special occupations require a child receipt and cannot be imported on an unrelated parent',async()=>{
 const {naturalFamily}=await import('./helpers/adult-family-simulation');const {decodeSave,encodeSave}=await import('../src/game/storage');
 for(const life of naturalFamily(135,6,'NGA')){
  const state=life.descendants.children.find(s=>s.supportedWork);if(!state)continue;
  const missing=structuredClone(life);delete missing.descendants.children.find(s=>s.childId===state.childId)!.supportedWork;
  missing.family.children.find(c=>c.id===state.childId)!.job='dayActivities';
  assert.throws(()=>decodeSave(encodeSave(missing,[])));
  const parent=structuredClone(life);parent.family.parents[0].job='shelteredWork';assert.throws(()=>decodeSave(encodeSave(parent,[])));return;
 }
 assert.fail('missing checkpoint');
});

test('family panel renders the recorded support setting without a fabricated wage',async()=>{
 const {naturalFamily}=await import('./helpers/adult-family-simulation');
 const React=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');
 const {FamilyDescendants}=await import('../src/components/FamilyDescendants');const {translator}=await import('../src/lib/i18n');
 for(const life of naturalFamily(135,6,'NGA')){
  const state=life.descendants.children.find(s=>s.supportedWork);if(!state)continue;
  const child=life.family.children.find(c=>c.id===state.childId)!;
  const view=structuredClone(life);view.family.children=[child];view.descendants.children=[state];view.descendants.grandchildren=[];
  const t=translator('en'),work=state.supportedWork!;
  const html=renderToStaticMarkup(React.createElement(FamilyDescendants,{life:view,locale:'en',t}));
  assert.ok(html.includes(t(`family.supportedWork.${work.kind==='dayActivities'&&!work.richAccess?'homeCare':work.kind}`)));
  assert.ok(!html.includes('Annual income:'));return;
 }
 assert.fail('missing natural support checkpoint');
});

test('an established legacy career is not rewritten as newly observed supported work',async()=>{
 const {naturalFamily,familyChoice}=await import('./helpers/adult-family-simulation');const {decodeSave,encodeSave}=await import('../src/game/storage');
 for(const life of naturalFamily(135,6,'NGA')){
  const state=life.descendants.children.find(s=>s.supportedWork);if(!state)continue;
  const legacy=structuredClone(life),s=legacy.descendants.children.find(s=>s.childId===state.childId)!;
  delete s.supportedWork;s.employment='employed';s.income=2000;s.firstPayStatus='unknown';
  legacy.family.children.find(c=>c.id===s.childId)!.job='mechanic';
  let next=decodeSave(encodeSave(legacy,[])).life!;
  for(let step=0;step<30&&next.age===legacy.age;step++)next=familyChoice(next);
  assert.ok(next.age>legacy.age||!next.alive);assert.equal(next.descendants.children.find(c=>c.childId===s.childId)!.supportedWork,undefined);return;
 }
 assert.fail('missing natural checkpoint');
});
