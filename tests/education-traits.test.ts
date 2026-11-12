import test from 'node:test';import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS} from '../src/game/engine';
import {educationTraits} from '../src/game/education-traits';
test('persisted attention and reading traits update admission modifiers from actual recognition',()=>{
 const life=createLife(DEFAULT_SETTINGS,5);life.birthDevelopment={version:1,developmental:null,attentionLearning:{adhd:true,dyslexia:true,persistentAdhd:true,noticedAt:7}};
 assert.deepEqual(educationTraits(life),{adhd:true,dyslexia:true,dyslexiaDiagnosed:false,unsupportedAutism:false,upperSecondaryMultiplier:.37*.8*.5,intellectualDisability:false});
 life.developmentObservations={version:1,lastCheckedAge:9,adhd:{age:7,diagnosed:true},dyslexia:{age:9,diagnosed:true}};
 const before=structuredClone(life);assert.equal(educationTraits(life)!.upperSecondaryMultiplier,.37);assert.equal(educationTraits(life)!.dyslexiaDiagnosed,true);assert.deepEqual(life,before);
});
test('known absent traits differ from unknown legacy facts and autism is not inferred from diagnosis',()=>{
 const life=createLife(DEFAULT_SETTINGS,5);delete life.birthDevelopment;assert.equal(educationTraits(life),null);
 life.birthDevelopment={version:1,developmental:null,attentionLearning:null};assert.equal(educationTraits(life)!.upperSecondaryMultiplier,1);
 life.birthDevelopment.developmental={kind:'autism',intellectualDisability:false,supportLevel:1,learningDifficulty:false,noticedAt:20};assert.equal(educationTraits(life)!.unsupportedAutism,true);
 life.birthDevelopment.developmental.intellectualDisability=true;life.birthDevelopment.developmental.learningDifficulty=true;
 assert.equal(educationTraits(life)!.unsupportedAutism,false);assert.equal(educationTraits(life)!.intellectualDisability,true);
});

test('secondary and college contexts use changing recognition instead of stale copied booleans',async()=>{
 const {createLearningState}=await import('../src/game/learning-state');const {collegeContext}=await import('../src/game/college-context');const {upperSecondaryContext}=await import('../src/game/upper-secondary-context');
 const life=createLife({...DEFAULT_SETTINGS,country:'NGA'},5);life.age=18;life.year=life.birthYear+18;life.learning=createLearningState(18,{study:0,body:0,art:0,music:0,hands:0,words:0},60);
 life.birthDevelopment={version:1,developmental:null,attentionLearning:{adhd:true,dyslexia:true,persistentAdhd:true,noticedAt:7}};
 const college={kind:'ordinary' as const,job:'seeking' as const,retaking:false,vocationalTrack:false,accessModifiers:{},adhd:false,dyslexia:false,dyslexiaDiagnosed:false,unsupportedAutism:false,politicallyMarkedParent:false};
 const upper={homeSchool:false,refugeeCamp:false,refugee:false,irregular:false,returning:false,alreadySpecialist:false,hobbies:[],accessModifiers:{}};
 assert.equal(collegeContext(life,college)!.neurodevelopmentMultiplier,.76*(.4*.93));
 const before=upperSecondaryContext(life,upper)!.transition;
 life.developmentObservations={version:1,lastCheckedAge:18,adhd:{age:7,diagnosed:true},dyslexia:{age:9,diagnosed:true}};
 assert.equal(collegeContext(life,college)!.neurodevelopmentMultiplier,.76*.4);
 assert.ok(upperSecondaryContext(life,upper)!.transition>before);
 life.birthDevelopment={version:1,developmental:null,attentionLearning:null};
 assert.equal(collegeContext(life,{...college,adhd:true,dyslexia:true,unsupportedAutism:true})!.neurodevelopmentMultiplier,1);
 assert.equal(collegeContext(life,{...college,unsupportedAutism:true})!.unsupportedAutism,false);
});

test('adult recognition changes current support without rewriting the childhood assessment',()=>{
 const life=createLife(DEFAULT_SETTINGS,5);life.birthDevelopment={version:1,developmental:null,attentionLearning:{adhd:true,dyslexia:false,persistentAdhd:true,noticedAt:7}};
 life.developmentObservations={version:1,lastCheckedAge:25,adhd:{age:7,diagnosed:false},adultAdhd:25};
 assert.equal(educationTraits(life)!.upperSecondaryMultiplier,.37);
 assert.equal(life.developmentObservations.adhd!.diagnosed,false);
});
