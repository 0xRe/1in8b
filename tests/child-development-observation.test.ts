import test from 'node:test';import assert from 'node:assert/strict';
import {observeChildDevelopment} from '../src/game/child-development-observation';
const access={country:'USA',region:'hi',ppp:50000,urban:true,year:2026};
const trait={kind:'autism' as const,intellectualDisability:false,supportLevel:1 as const,learningDifficulty:true,noticedAt:3};
test('child first recognition can also record early therapy and never repeats',()=>{
 const result=observeChildDevelopment(undefined,{age:3,alive:true,away:false,trait,access});
 assert.deepEqual(result?.events,['autismDiagnosed','earlyTherapy']);assert.equal(result?.record.diagnosed,true);
 assert.equal(observeChildDevelopment(result!.record,{age:4,alive:true,away:false,trait,access}),null);
});
test('late autism observation can be silently consumed when assessment is unavailable',()=>{
 const late={...trait,learningDifficulty:false,noticedAt:25};
 const result=observeChildDevelopment(undefined,{age:25,alive:true,away:false,trait:late,access:{...access,ppp:1000}});
 assert.deepEqual(result?.events,[]);assert.equal(result?.record.diagnosed,false);
 assert.deepEqual(observeChildDevelopment(undefined,{age:25,alive:true,away:false,trait:late,access})?.events,['adultAutismDiagnosed']);
});
test('dead, separated and pre-onset children do not gain a recognition record',()=>{
 for(const overrides of [{alive:false},{away:true},{age:2}])assert.equal(observeChildDevelopment(undefined,{age:3,alive:true,away:false,trait,access,...overrides}),null);
});

test('normal child births reach developmental recognition and retain it across all saved states',async()=>{
 const {naturalFamily}=await import('./helpers/adult-family-simulation');const {encodeSave,decodeSave}=await import('../src/game/storage');
 let seen=false;
 for(const life of naturalFamily(66,6,'NGA')){
  assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
  if(life.events.some(e=>e.key.startsWith('event.childDevelopment.')))seen=true;
 }
 assert.ok(seen,'natural child developmental event must be reachable');
});
test('recognition imports require matching birth traits and consistent therapy receipts',async()=>{
 const {validateChildDevelopmentObservation}=await import('../src/game/child-development-observation');
 const birth={version:1 as const,developmental:trait,attentionLearning:null};const record={version:1 as const,age:3,diagnosed:true,earlyTherapy:true};
 assert.doesNotThrow(()=>validateChildDevelopmentObservation(record,birth,4));
 assert.throws(()=>validateChildDevelopmentObservation(record,undefined,4));
 assert.throws(()=>validateChildDevelopmentObservation({...record,age:2},birth,4));
 assert.throws(()=>validateChildDevelopmentObservation({...record,diagnosed:false},birth,4));
 assert.throws(()=>validateChildDevelopmentObservation({...record,age:10},birth,10));
});
