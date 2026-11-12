import test from 'node:test';import assert from 'node:assert/strict';
import {childDevelopmentAdmission} from '../src/game/child-admission';
test('unknown child traits remain neutral while recognition changes attention and reading modifiers',()=>{
 assert.deepEqual(childDevelopmentAdmission(undefined,undefined),{multiplier:1,severe:false});
 const birth={version:1 as const,developmental:null,attentionLearning:{adhd:true,dyslexia:true,persistentAdhd:true,noticedAt:8}};
 assert.deepEqual(childDevelopmentAdmission(birth,undefined),{multiplier:.7*.36,severe:false});
 assert.deepEqual(childDevelopmentAdmission(birth,{lastCheckedAge:9,adhd:{age:8,diagnosed:true},dyslexia:{age:9,diagnosed:true}}),{multiplier:.73*.41,severe:false});
});
test('developmental support levels and intellectual disability gate child admission',()=>{
 const developmental={kind:'autism' as const,intellectualDisability:false,supportLevel:1 as const,learningDifficulty:false,noticedAt:8};
 const birth={version:1 as const,developmental,attentionLearning:null};
 assert.deepEqual(childDevelopmentAdmission(birth,undefined),{multiplier:.66,severe:false});
 assert.deepEqual(childDevelopmentAdmission({...birth,developmental:{...developmental,intellectualDisability:true}},undefined),{multiplier:.43,severe:false});
 assert.deepEqual(childDevelopmentAdmission({...birth,developmental:{...developmental,supportLevel:2}},undefined),{multiplier:0,severe:true});
});

test('annual family runtime uses the saved severe-support gate through both admission ages',async()=>{
 const {naturalFamily,familyChoice}=await import('./helpers/adult-family-simulation');
 const {encodeSave,decodeSave}=await import('../src/game/storage');
 let life=[...naturalFamily(1,6,'USA')].find(l=>l.family.children.some(c=>c.alive&&c.age===17))!;
 const child=life.family.children.find(c=>c.alive&&c.age===17)!;
 const progress=life.descendants.children.find(s=>s.childId===child.id)!;
 progress.birthDevelopment={version:1,developmental:{kind:'intellectual',intellectualDisability:true,supportLevel:2,learningDifficulty:true,noticedAt:3},attentionLearning:null};
 delete progress.learningObservations;
 let seen18=false,seen19=false;
 for(let action=0;action<80&&life.alive;action++){
  life=familyChoice(life);const current=life.family.children.find(c=>c.id===child.id)!;const state=life.descendants.children.find(s=>s.childId===child.id)!;
  assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
  if(current.age===18&&state.admission?.attemptedAge===18){assert.equal(state.admission.path,null);seen18=true;}
  if(current.age===19&&state.admission?.attemptedAge===19){assert.equal(state.admission.path,'work');assert.notEqual(state.education,'university');seen19=true;break;}
 }
 assert.ok(seen18&&seen19,'both annual admission boundaries must execute');
});
