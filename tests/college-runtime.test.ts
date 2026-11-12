import test from 'node:test';import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {advanceYear,advanceTimeline,makeChoice,addReflection} from '../src/game/engine';
import {decodeSave,encodeSave} from '../src/game/storage';
import {getCountryById} from '../src/game/countries';
import {collegeDecision} from '../src/game/college-runtime';
function fixture(country='DEU'){
 const life=structuredClone([...naturalFamily(1)].find(l=>l.age===17&&!l.pendingDecision)!);
 life.country=getCountryById(country);life.migration.birthCountry=getCountryById(country);
 life.stats.employment='student';life.stats.job='student';life.stats.annualIncome=0;life.schooling.enrolled=true;life.schooling.childLabor=false;
 life.academics={version:1,qualification:2,doctorate:false,medicine:false,studyCountry:country,enrollment:{stage:'upperSecondary',completedYears:3,lastSettledAge:17,paused:false,graduationPending:true},circumstances:{homeSchool:false,learningCentre:false,topMarkAge:null,developmentalProtection:false,accessModifiers:{}},collegeFacts:{adhd:false,dyslexia:false,dyslexiaDiagnosed:false,unsupportedAutism:false,politicallyMarkedParent:false,rohingyaCamp:false,rohingyaRakhine:false}};
 return life;
}
function graduate(life:ReturnType<typeof fixture>){for(let i=0;i<40&&life.age===17;i++)life=life.pendingDecision?life.pendingDecision.type==='reflection'?addReflection(life,''):makeChoice(life,life.pendingDecision.choices[0].id):advanceYear(life,.000001);return life;}
test('upper-school graduation queues domestic college admission through the real timeline and save',()=>{
 let life=graduate(fixture());assert.equal(life.age,18);assert.ok(collegeDecision(life));
 assert.ok(life.timeline!.scheduledDecisions!.some(d=>d.id==='college-18'));
 life=advanceTimeline(decodeSave(encodeSave(life,[])).life!,1);
 assert.equal(life.pendingDecision?.id,'college-18');
 const before=life.rng,done=makeChoice(life,'collegeApply');
 assert.equal(done.rng,before,'German open admission must not consume a random draw');
 assert.equal(done.academics!.enrollment?.stage,'university');assert.equal(done.academics!.enrollment!.completedYears,0);
 assert.equal(done.academics!.qualification,3);assert.equal(done.schooling.enrolled,true);assert.equal(done.stats.job,'student');
 assert.ok(done.events.some(e=>e.key==='event.college.enrolled'));assert.equal(done.pendingDecision,null);
 assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);assert.deepEqual(makeChoice(done,'collegeApply'),done);
});
test('work selection and stale custody/country offers cannot enroll or consume random draws',()=>{
 const pending=advanceTimeline(graduate(fixture()),1);
 const done=makeChoice(pending,'collegeWork');assert.equal(done.stats.job,'none');assert.equal(done.stats.employment,'unemployed');assert.equal(done.schooling.enrolled,false);
 assert.equal(done.academics!.college!.status,'work');assert.ok(decodeSave(encodeSave(done,[])).life);
 for(const mutate of [(l:typeof pending)=>{l.justice.prisonUntil=l.age+2;},(l:typeof pending)=>{l.country=getCountryById('JPN');}]){
  const stale=structuredClone(pending);mutate(stale);const after=makeChoice(stale,'collegeApply');
  assert.equal(after.pendingDecision,null);assert.equal(after.rng,stale.rng);assert.equal(after.academics!.enrollment,null);
 }
});
test('missing access facts never backfill or fabricate a college offer',()=>{
 const life=fixture();delete life.academics!.collegeFacts;
 const after=graduate(life);assert.equal(collegeDecision(after),null);assert.equal(after.academics!.college,undefined);
});

test('competitive rejection is persisted once and malformed admission facts/choices are rejected',()=>{
 const pending=advanceTimeline(graduate(fixture('JPN')),1);
 let rejected:typeof pending|null=null;
 for(let rng=1;rng<1000&&!rejected;rng++){
  const attempt=structuredClone(pending);attempt.rng=rng;
  const result=makeChoice(attempt,'collegeApply');
  if(result.academics!.college!.status==='rejected')rejected=result;
 }
 assert.ok(rejected);assert.equal(rejected.academics!.enrollment,null);
 assert.equal(rejected.stats.employment,'unemployed');assert.equal(rejected.schooling.enrolled,false);
 assert.ok(rejected.events.some(e=>e.key==='event.college.rejected'));
 assert.deepEqual(decodeSave(encodeSave(rejected,[])).life,rejected);
 const badFacts=structuredClone(pending);badFacts.academics!.collegeFacts!.adhd='false' as never;assert.throws(()=>encodeSave(badFacts,[]));
 const badChoice=structuredClone(pending);badChoice.pendingDecision!.choices[0].id='abroad';assert.throws(()=>encodeSave(badChoice,[]));
});

test('restricted camp graduation records its block once and does not offer impossible admission',()=>{
 const input=fixture('BGD');input.academics!.collegeFacts!.rohingyaCamp=true;
 const done=graduate(input);assert.equal(done.academics!.college!.status,'blocked');assert.equal(collegeDecision(done),null);
 assert.equal(done.stats.employment,'unemployed');assert.ok(done.events.some(e=>e.key==='event.college.camp'));
 assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
});

test('admission can continue through a full public-action lifetime with deterministic save restoration',async()=>{
 const {familyChoice}=await import('./helpers/adult-family-simulation');
 let life=makeChoice(advanceTimeline(graduate(fixture()),1),'collegeApply');
 let observedUniversityYear=false;
 for(let step=0;step<500&&life.alive;step++){
  const restored=decodeSave(encodeSave(life,[])).life!;
  const next=familyChoice(life);assert.deepEqual(next,familyChoice(restored));life=next;
  if((life.academics!.enrollment?.completedYears??0)>0)observedUniversityYear=true;
 }
 assert.ok(observedUniversityYear);assert.equal(life.alive,false);assert.ok(decodeSave(encodeSave(life,[])).life);
});

test('equivalency pass hands off to college next year and preserves an employed work choice',async()=>{
 const {settleEquivalencyRuntime}=await import('../src/game/upper-secondary-runtime');
 const life=fixture();life.academics!.enrollment=null;life.academics!.equivalency={examAt:17,target:3};
 life.schooling.enrolled=false;life.stats.job='service';life.stats.employment='employed';life.stats.annualIncome=1234;
 assert.equal(settleEquivalencyRuntime(life,()=>0),'passed');
 assert.equal(life.academics!.equivalency!.collegePending,true);
 const entered=graduate(decodeSave(encodeSave(life,[])).life!);
 assert.equal(entered.academics!.college?.kind,'equivalency');
 assert.equal(entered.academics!.equivalency!.collegePending,false);
 const pending=advanceTimeline(entered,1);assert.equal(pending.pendingDecision?.id,'college-18');
 assert.equal(pending.pendingDecision!.choices.find(c=>c.id==='collegeWork')!.key,'choice.collegeKeepWorking');
 const legacy=structuredClone(pending);legacy.pendingDecision!.choices.find(c=>c.id==='collegeWork')!.key='choice.collegeWork';
 assert.equal(decodeSave(encodeSave(legacy,[])).life!.pendingDecision!.choices.find(c=>c.id==='collegeWork')!.key,'choice.collegeKeepWorking');
 const forged=structuredClone(pending);forged.pendingDecision!.choices.find(c=>c.id==='collegeWork')!.key='choice.collegeApply';assert.throws(()=>encodeSave(forged,[]));
 const income=pending.stats.annualIncome,job=pending.stats.job;
 const done=makeChoice(pending,'collegeWork');assert.equal(done.stats.job,job);assert.equal(done.stats.annualIncome,income);
 assert.equal(done.academics!.college!.status,'work');assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
 assert.deepEqual(makeChoice(done,'collegeWork'),done);
});

test('equivalency college acceptance consumes the pass once and rejects a missing or future pass receipt',async()=>{
 const {settleEquivalencyRuntime}=await import('../src/game/upper-secondary-runtime');
 const life=fixture();life.academics!.enrollment=null;life.academics!.equivalency={examAt:17,target:3};
 life.schooling.enrolled=false;life.stats.job='service';life.stats.employment='employed';life.stats.annualIncome=1234;
 assert.equal(settleEquivalencyRuntime(life,()=>0),'passed');
 const pending=advanceTimeline(graduate(life),1);
 assert.deepEqual(decodeSave(encodeSave(pending,[])).life,pending);
 const done=makeChoice(pending,'collegeApply');assert.equal(done.academics!.enrollment?.stage,'university');
 assert.equal(done.stats.job,'student');assert.equal(done.stats.annualIncome,0);
 assert.equal(done.academics!.equivalency!.collegePending,false);
 assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);assert.deepEqual(makeChoice(done,'collegeApply'),done);
 for(const mutation of [(l:typeof done)=>{delete l.academics!.equivalency;},(l:typeof done)=>{l.academics!.equivalency!.highSchoolPassAge=l.age+1;},(l:typeof done)=>{l.academics!.equivalency!.collegePending=true;}]){
  const bad=structuredClone(done);mutation(bad);assert.throws(()=>encodeSave(bad,[]));
 }
});

test('current reading support changes actual college retention and survives save restoration',()=>{
 const input=fixture();
 input.birthDevelopment={version:1,developmental:null,attentionLearning:{adhd:false,dyslexia:true,persistentAdhd:false,noticedAt:null}};
 const pending=advanceTimeline(graduate(input),1);
 const recognized=structuredClone(pending);
 recognized.developmentObservations={version:1,lastCheckedAge:18,dyslexia:{age:18,diagnosed:true}};
 const before=structuredClone(recognized);
 const unsupported=makeChoice(pending,'collegeApply');
 const supported=makeChoice(decodeSave(encodeSave(recognized,[])).life!,'collegeApply');
 assert.equal(supported.academics!.enrollment?.stage,'university');
 assert.ok(supported.academics!.enrollment!.retention!>unsupported.academics!.enrollment!.retention!);
 assert.deepEqual(recognized,before,'application must not mutate its input');
 assert.deepEqual(decodeSave(encodeSave(supported,[])).life,supported);
 assert.deepEqual(makeChoice(supported,'collegeApply'),supported);
});
