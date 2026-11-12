import test from 'node:test';import assert from 'node:assert/strict';
import {observeChildLearning} from '../src/game/child-learning-observation';
const access={country:'USA',region:'hi',ppp:50000,urban:true,year:2026};
const traits={adhd:true,dyslexia:true,persistentAdhd:true,noticedAt:8};
test('child attention precedes reading, persists and never repeats in one year',()=>{
 const s:any={};const input={age:8,alive:true,away:false,traits,access};
 assert.equal(observeChildLearning(s,input,()=>0),'adhdDiagnosed');
 assert.equal(observeChildLearning(s,input,()=>{throw Error('duplicate');}),null);
 assert.equal(observeChildLearning(s,{...input,age:9,access:{...access,year:2027}},()=>0),'dyslexiaDiagnosed');
 assert.deepEqual(s.adhd,{age:8,diagnosed:true});assert.deepEqual(s.dyslexia,{age:9,diagnosed:true});
});
test('child reading requires age eight and PPP eight thousand, not enrollment',()=>{
 const s:any={};const input={age:8,alive:true,away:false,traits:{...traits,adhd:false,noticedAt:null},access:{...access,ppp:7999}};
 assert.equal(observeChildLearning(s,input,()=>{throw Error('insufficient access');}),null);
 assert.equal(observeChildLearning(s,{...input,age:9,access:{...access,ppp:8000}},()=>0),'dyslexiaDiagnosed');
});
test('dead, away and unknown children are inert without consuming observations',()=>{
 for(const overrides of [{alive:false},{away:true},{traits:null}]){const s:any={};assert.equal(observeChildLearning(s,{age:12,alive:true,away:false,traits,access,...overrides},()=>{throw Error('ineligible');}),null);assert.deepEqual(s,{});}
});

test('ordinary births reach child learning events and every generated save restores',async()=>{
 const {naturalFamily}=await import('./helpers/adult-family-simulation');const {encodeSave,decodeSave}=await import('../src/game/storage');
 let observed=false;
 for(let seed=1;seed<=32&&!observed;seed++)for(const life of naturalFamily(seed,6,'USA')){
  assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
  if(life.events.some(e=>e.key.startsWith('event.childLearning.')))observed=true;
 }
 assert.ok(observed,'normal birth and annual engine must reach a family observation');
});
test('child receipt validation rejects unknown traits, future ages and same-year observations',async()=>{
 const {validateChildLearning}=await import('../src/game/child-learning-observation');
 const birth={version:1 as const,developmental:null,attentionLearning:traits};
 const good={lastCheckedAge:9,adhd:{age:8,diagnosed:true},dyslexia:{age:9,diagnosed:false}};
 assert.doesNotThrow(()=>validateChildLearning(good,birth,9));
 assert.throws(()=>validateChildLearning(good,undefined,9));assert.throws(()=>validateChildLearning(good,birth,8));
 assert.throws(()=>validateChildLearning({...good,dyslexia:{age:8,diagnosed:false}},birth,9));
});

test('independent children remain observable and family observations do not change parent stats',async()=>{
 const {naturalFamily}=await import('./helpers/adult-family-simulation');const {childLearningYear}=await import('../src/game/child-learning-observation');
 const life=[...naturalFamily(1,6,'USA')].find(l=>l.family.children.some(c=>c.alive&&c.age>=18))!;
 const child=life.family.children.find(c=>c.alive&&c.age>=18)!;
 for(const p of life.descendants.children){delete p.learningObservations;delete p.birthDevelopment;}
 const p=life.descendants.children.find(s=>s.childId===child.id)!;
 p.residence='independent';p.birthDevelopment={version:1,developmental:null,attentionLearning:traits};
 const before=structuredClone(life.stats);const events:string[]=[];
 childLearningYear(life,()=>0,(key,name)=>events.push(`${key}:${name}`));
 assert.deepEqual(events,[`adhdDiagnosed:${child.name}`]);assert.deepEqual(life.stats,before);
 childLearningYear(life,()=>{throw Error('repeat');},()=>{throw Error('repeat event');});
});
