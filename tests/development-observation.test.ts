import test from 'node:test';import assert from 'node:assert/strict';
import {namedLearningProbability,observeDevelopment} from '../src/game/development-observation';
import {createLife,DEFAULT_SETTINGS} from '../src/game/engine';
const context={country:'USA',region:'hi',ppp:50000,urban:false,year:2026};
test('diagnosis access follows country/year and urban resource thresholds',()=>{
 assert.equal(namedLearningProbability({...context,year:1986},'adhd'),0);assert.equal(namedLearningProbability({...context,year:1987},'adhd'),.9);
 assert.equal(namedLearningProbability({...context,year:1976},'dyslexia'),0);assert.equal(namedLearningProbability({...context,year:1977},'dyslexia'),.68);
 assert.equal(namedLearningProbability({...context,country:'SWE',year:2004},'adhd'),.3);assert.equal(namedLearningProbability({...context,country:'SWE',year:2005},'adhd'),.85);
 assert.equal(namedLearningProbability({...context,country:'KOR',year:2019},'adhd'),.15);assert.equal(namedLearningProbability({...context,country:'KOR',year:2020},'adhd'),.4);
 assert.equal(namedLearningProbability({...context,ppp:9999},'adhd'),0);assert.equal(namedLearningProbability({...context,ppp:4000,urban:true},'adhd'),.9);
});
function life(){const l=createLife({...DEFAULT_SETTINGS,country:'USA'},1);l.age=8;l.year=l.birthYear+8;l.birthDevelopment={version:1,developmental:null,attentionLearning:{adhd:true,dyslexia:true,persistentAdhd:true,noticedAt:8}};l.schooling.enrolled=true;return l;}
test('ADHD observation precedes dyslexia and cannot repeat in the same year',()=>{
 const l=life();const before=l.stats.happiness;
 assert.equal(observeDevelopment(l,()=>0),'adhdDiagnosed');assert.equal(l.stats.happiness,before+1);
 assert.equal(observeDevelopment(l,()=>{throw Error('repeat draw');}),null);assert.equal(l.developmentObservations!.dyslexia,undefined);
 l.age++;l.year++;assert.equal(observeDevelopment(l,()=>.99),'dyslexiaUnrecognized');assert.equal(l.stats.happiness,before-1);
 l.age++;l.year++;let draws=0;assert.equal(observeDevelopment(l,()=>{draws++;return .99;}),null);assert.equal(draws,2,'only the two later strength branches draw');assert.deepEqual(l.developmentObservations!.adhd,{age:8,diagnosed:true});
});
test('dyslexia waits for enrollment; unknown old births and explicit absent traits remain inert',()=>{
 const l=life();l.birthDevelopment!.attentionLearning!.adhd=false;l.birthDevelopment!.attentionLearning!.persistentAdhd=false;l.birthDevelopment!.attentionLearning!.noticedAt=null;l.schooling.enrolled=false;
 assert.equal(observeDevelopment(l,()=>{throw Error('out of school');}),null);
 l.age++;l.year++;l.schooling.enrolled=true;assert.equal(observeDevelopment(l,()=>0),'dyslexiaDiagnosed');
 const old=life();delete old.birthDevelopment;assert.equal(observeDevelopment(old,()=>{throw Error('legacy');}),null);assert.equal(old.developmentObservations,undefined);
});

test('developmental recognition is deterministic and respects historical access without random diagnosis',()=>{
 const l=life();l.birthDevelopment={version:1,developmental:{kind:'autism',intellectualDisability:false,supportLevel:1,learningDifficulty:false,noticedAt:8},attentionLearning:null};
 assert.equal(observeDevelopment(l,()=>{throw Error('developmental initial diagnosis is deterministic');}),'autismDiagnosed');assert.equal(l.developmentObservations!.developmental!.diagnosed,true);
 const historical=life();historical.birthYear=1960;historical.year=1968;historical.birthDevelopment=structuredClone(l.birthDevelopment);assert.equal(observeDevelopment(historical,()=>{throw Error('draw');}),'developmentUnrecognized');
 assert.equal(historical.developmentObservations!.developmental!.diagnosed,false);
});

test('a normally generated life observes attention traits through the annual engine and keeps receipts on replay',async()=>{
 const {naturalFamily}=await import('./helpers/adult-family-simulation');const {encodeSave,decodeSave}=await import('../src/game/storage');
 let selected=0;
 for(let seed=1;seed<=500;seed++){if(createLife({...DEFAULT_SETTINGS,country:'USA'},seed).birthDevelopment?.attentionLearning?.adhd){selected=seed;break;}}
 assert.ok(selected);let seen=false;
 for(const current of naturalFamily(selected,6,'USA')){
  assert.deepEqual(decodeSave(encodeSave(current,[])).life,current);
  const receipt=current.developmentObservations?.adhd;
  if(receipt){assert.ok(current.events.some(e=>e.key===`event.development.adhd${receipt.diagnosed?'Diagnosed':'Unrecognized'}`));seen=true;}
 }
 assert.ok(seen,'natural life must reach an observed attention event');
});

test('observation receipts reject absent traits, future ages and duplicate same-year attention observations',async()=>{
 const {validateDevelopmentObservations}=await import('../src/game/development-observation');
 const l=life();observeDevelopment(l,()=>0);assert.doesNotThrow(()=>validateDevelopmentObservations(l));
 for(const mutate of [(v:typeof l)=>{delete v.birthDevelopment;},(v:typeof l)=>{v.developmentObservations!.adhd!.age=9;},(v:typeof l)=>{v.developmentObservations!.dyslexia={age:8,diagnosed:true};},(v:typeof l)=>{v.developmentObservations!.adhd!.diagnosed=1 as never;}]){
  const bad=structuredClone(l);mutate(bad);assert.throws(()=>validateDevelopmentObservations(bad));
 }
});

test('adult ADHD recognition preserves the first observation and does not recur',()=>{
 const l=life();l.age=31;l.year=l.birthYear+31;l.developmentObservations={version:1,lastCheckedAge:30,adhd:{age:8,diagnosed:false},dyslexia:{age:9,diagnosed:true}};
 assert.equal(observeDevelopment(l,()=>0),'adultAdhdDiagnosed');
 assert.equal(l.developmentObservations.adhd.diagnosed,false);
 assert.equal((l.developmentObservations as any).adultAdhd,31);
 assert.equal(observeDevelopment(l,()=>{throw Error('same year');}),null);
 l.age=56;l.year=l.birthYear+56;assert.equal(observeDevelopment(l,()=>{throw Error('expired age windows');}),null);
});
test('attention strengths precede reading strengths and each is consumed once',()=>{
 const l=life();l.developmentObservations={version:1,lastCheckedAge:7,adhd:{age:7,diagnosed:true},dyslexia:{age:7,diagnosed:true}};
 assert.equal(observeDevelopment(l,()=>0),'attentionStrength');
 l.age=9;l.year=l.birthYear+9;assert.equal(observeDevelopment(l,()=>0),'readingStrength');
 l.age=10;l.year=l.birthYear+10;assert.equal(observeDevelopment(l,()=>{throw Error('completed child stories');}),null);
});

test('adult support branches respect priority, historical wording and stored receipts',()=>{
 const l=life();l.age=31;l.year=l.birthYear+31;l.developmentObservations={version:1,lastCheckedAge:30,adhd:{age:8,diagnosed:true},dyslexia:{age:9,diagnosed:true}};
 assert.equal(observeDevelopment(l,()=>0),'reminders');l.age++;l.year++;
 assert.equal(observeDevelopment(l,()=>0),'audiobooks');l.age++;l.year++;
 assert.equal(observeDevelopment(l,()=>{throw Error('one-time support rerolled');}),null);
 const historical=life();historical.birthYear=1960;historical.age=31;historical.year=1991;historical.birthDevelopment!.attentionLearning!.adhd=false;historical.birthDevelopment!.attentionLearning!.persistentAdhd=false;historical.birthDevelopment!.attentionLearning!.noticedAt=null;historical.developmentObservations={version:1,lastCheckedAge:30,dyslexia:{age:9,diagnosed:false}};
 assert.equal(observeDevelopment(historical,()=>0),'readingAloud');
});
test('follow-up validation rejects impossible ages, traits and repeated annual outcomes',async()=>{
 const {validateDevelopmentObservations}=await import('../src/game/development-observation');
 const l=life();l.age=35;l.year=l.birthYear+35;l.developmentObservations={version:1,lastCheckedAge:35,adhd:{age:8,diagnosed:false},dyslexia:{age:9,diagnosed:true},adultAdhd:31,stories:{reminders:32,listening:33}};
 assert.doesNotThrow(()=>validateDevelopmentObservations(l));
 for(const mutate of [(v:typeof l)=>{v.developmentObservations!.adultAdhd=17;},(v:typeof l)=>{v.developmentObservations!.stories!.reminders=31;},(v:typeof l)=>{v.developmentObservations!.stories!.attentionEases=20;},(v:typeof l)=>{v.developmentObservations!.stories!.listening=60;}]){const bad=structuredClone(l);mutate(bad);assert.throws(()=>validateDevelopmentObservations(bad));}
});

test('a first observation cannot share a year with a follow-up outcome',async()=>{
 const {validateDevelopmentObservations}=await import('../src/game/development-observation');
 const l=life();l.age=30;l.year=l.birthYear+30;l.developmentObservations={version:1,lastCheckedAge:30,adhd:{age:8,diagnosed:true},dyslexia:{age:26,diagnosed:true},stories:{reminders:26}};
 assert.throws(()=>validateDevelopmentObservations(l));
});

test('adult recognition uses the stricter rich-region gate, not childhood assessment access',()=>{
 const l=life();l.country=createLife({...DEFAULT_SETTINGS,country:'CHN'},1).country;l.age=51;l.year=l.birthYear+51;
 l.birthDevelopment!.attentionLearning!.dyslexia=false;
 l.developmentObservations={version:1,lastCheckedAge:50,adhd:{age:8,diagnosed:false}};
 assert.equal(observeDevelopment(l,()=>{throw Error('adult assessment is unavailable in this region');}),null);
 assert.equal(l.developmentObservations.adultAdhd,undefined);
});
