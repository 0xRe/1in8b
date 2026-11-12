import test from 'node:test';import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {advanceYear,advanceTimeline,makeChoice,addReflection} from '../src/game/engine';
import {getCountryById} from '../src/game/countries';
import {encodeSave,decodeSave} from '../src/game/storage';
function fixture(country='USA'){
 const l=structuredClone([...naturalFamily(1)].find(l=>l.age===14&&!l.pendingDecision)!);
 l.country=getCountryById(country);l.migration.birthCountry=getCountryById(country);l.stats.incomeQuintile=1;l.stats.job='student';l.stats.employment='student';l.schooling.enrolled=true;l.stats.annualIncome=0;
 l.academics={version:1,qualification:1,doctorate:false,medicine:false,studyCountry:country,enrollment:{stage:'lowerSecondary',completedYears:3,lastSettledAge:14,paused:false,graduationPending:true},circumstances:{homeSchool:false,learningCentre:false,topMarkAge:null,developmentalProtection:false,accessModifiers:{}},upperFacts:{refugee:false,irregular:false,refugeeCamp:false,unregisteredBirth:false,militaryAcademy:false,studyAbroad:false,bullyingCount:0,hobbies:[]}};
 return l;
}
function graduate(life:ReturnType<typeof fixture>){const age=life.age;for(let i=0;i<40&&life.age===age;i++)life=life.pendingDecision?life.pendingDecision.type==='reflection'?addReflection(life,''):makeChoice(life,life.pendingDecision.choices[0].id):advanceYear(life,.000001);return life;}
test('lower-secondary graduation queues a saved upper-secondary menu and vocational choice enrolls at zero credit',()=>{
 let l=graduate(fixture());assert.equal(l.age,15);assert.equal(l.academics!.qualification,2);
 assert.ok(l.timeline!.scheduledDecisions!.some(d=>d.id==='upperSecondary-15'));
 l=advanceTimeline(decodeSave(encodeSave(l,[])).life!,1);
 assert.equal(l.pendingDecision?.id,'upperSecondary-15');assert.deepEqual(l.pendingDecision.choices.map(c=>c.id),['upperGo','upperVoc']);
 const done=makeChoice(l,'upperVoc');assert.equal(done.academics!.enrollment!.stage,'vocational');assert.equal(done.academics!.enrollment!.completedYears,0);
 assert.equal(done.academics!.qualification,2);assert.equal(done.stats.job,'student');assert.ok(done.academics!.enrollment!.retention);
 assert.deepEqual(makeChoice(done,'upperVoc'),done);assert.ok(decodeSave(encodeSave(done,[])).life);
});
test('work choice starts job seeking while automatic homeschool continues general education',()=>{
 let l=advanceTimeline(graduate(fixture('UGA')),1);assert.equal(l.pendingDecision?.id,'upperSecondary-15');
 const done=makeChoice(l,'upperWork');assert.equal(done.academics!.enrollment,null);assert.equal(done.schooling.enrolled,false);assert.equal(done.stats.employment,'unemployed');assert.equal(done.academics!.qualification,2);
 const home=fixture();home.academics!.circumstances!.homeSchool=true;const admitted=graduate(home);
 assert.equal(admitted.academics!.enrollment!.stage,'upperSecondary');assert.equal(admitted.academics!.enrollment!.completedYears,0);
 assert.ok(decodeSave(encodeSave(admitted,[])).life);
});
test('upper-secondary offers become inert after relocation or custody without spending random draws',()=>{
 const l=advanceTimeline(graduate(fixture()),1);assert.equal(l.pendingDecision?.id,'upperSecondary-15');
 for(const change of [(x:typeof l)=>{x.country=getCountryById('UGA');},(x:typeof l)=>{x.justice.prisonUntil=x.age+1;}]){
 const changed=structuredClone(l);change(changed);const done=makeChoice(changed,'upperGo');assert.equal(done.pendingDecision,null);assert.equal(done.rng,changed.rng);assert.equal(done.academics!.enrollment,null);
 }
});
test('unknown source school facts do not silently activate the new school pipeline',()=>{
 const l=fixture();delete l.academics!.upperFacts;const done=graduate(l);
 assert.equal(done.academics!.upperSecondary,undefined);assert.equal(done.timeline!.scheduledDecisions!.some(d=>d.id.startsWith('upperSecondary-')),false);
});
test('specialist admission applies source hobby gains and delayed registration once',()=>{
 const input=fixture();input.academics!.upperFacts!.hobbies=[{id:'music',since:10,level:3}];input.academics!.upperFacts!.unregisteredBirth=true;
 let l=advanceTimeline(graduate(input),1);assert.ok(l.pendingDecision!.choices.some(c=>c.id==='upperArts'));l.rng=7;
 const done=makeChoice(l,'upperArts');assert.equal(done.academics!.specialistSchool!.hobby,'music');assert.equal(done.academics!.upperFacts!.hobbies[0].level,5);
 assert.equal(done.academics!.upperFacts!.unregisteredBirth,false);assert.ok(done.events.some(e=>e.key==='event.upperSecondary.registration'));
 assert.ok(decodeSave(encodeSave(done,[])).life);assert.equal(makeChoice(done,'upperArts').rng,done.rng);
});
function emptyYear(l:ReturnType<typeof fixture>){l.pendingDecision=null;l.feed!.plan={year:l.year,age:l.age,queue:[],gates:{}};l.timeline={year:l.year,age:l.age,position:0,complete:false,queue:[],scheduledDecisions:[],focusTime:{}};return l;}
test('upper-secondary annual withdrawal and GED run through the real timeline once',()=>{
 let l=makeChoice(advanceTimeline(graduate(fixture()),1),'upperGo');l=emptyYear(l);l.academics!.enrollment!.retention=.05;l.stats.incomeQuintile=1;l.rng=7;
 const dropped=advanceTimeline(l,1);assert.equal(dropped.academics!.enrollment,null);assert.equal(dropped.stats.employment,'unemployed');assert.equal(dropped.academics!.qualification,2);
 l=structuredClone(l);l.stats.incomeQuintile=4;const queued=advanceTimeline(l,1);assert.ok(queued.academics!.secondaryProgress!.pending);assert.ok(queued.academics!.enrollment);
 const next=advanceTimeline(graduate(queued),1);assert.equal(next.pendingDecision?.id,'schoolWithdrawal-16');
 const left=makeChoice(next,'schoolGed');assert.equal(left.academics!.enrollment,null);assert.equal(left.academics!.equivalency!.examAt,17);
 const waiting=emptyYear(left);waiting.rng=7;const passed=advanceTimeline(waiting,1);assert.equal(passed.academics!.qualification,3);assert.equal(passed.academics!.equivalency!.collegePending,true);
 assert.equal(passed.academics!.equivalency!.examAt,null);assert.equal(advanceTimeline(passed,1).rng,passed.rng);assert.ok(decodeSave(encodeSave(passed,[])).life);
});
test('upper-secondary qualification requires all three observed course years and the graduation boundary',()=>{
 let l=makeChoice(advanceTimeline(graduate(fixture()),1),'upperGo');l.academics!.enrollment!.retention=1;l.stats.incomeQuintile=4;l.stats.knowledge=65;
 for(let year=1;year<=3;year++){
  l=advanceTimeline(emptyYear(l),1);assert.equal(l.academics!.enrollment!.completedYears,year);assert.equal(l.academics!.qualification,2);
  l=graduate(l);
 }
 assert.equal(l.academics!.qualification,3);assert.equal(l.academics!.enrollment,null);assert.equal(l.academics!.lastGraduation!.stage,'upperSecondary');
 assert.ok(decodeSave(encodeSave(l,[])).life);
});
test('expired withdrawal offers clear after custody instead of locking future school years',()=>{
 let l=makeChoice(advanceTimeline(graduate(fixture()),1),'upperGo');l=emptyYear(l);l.academics!.enrollment!.retention=.05;l.stats.incomeQuintile=4;l.rng=7;
 const queued=advanceTimeline(l,1);const offered=advanceTimeline(graduate(queued),1);assert.equal(offered.pendingDecision?.id,'schoolWithdrawal-16');
 offered.justice.prisonUntil=18;const rng=offered.rng;const dismissed=makeChoice(offered,'schoolGed');
 assert.equal(dismissed.pendingDecision,null);assert.equal(dismissed.academics!.secondaryProgress!.pending,null);assert.equal(dismissed.academics!.equivalency,undefined);assert.equal(dismissed.rng,rng);
});
test('withdrawal eligibility lost before its timeline slot expires the queued record',()=>{
 let l=makeChoice(advanceTimeline(graduate(fixture()),1),'upperGo');l=emptyYear(l);l.academics!.enrollment!.retention=.05;l.stats.incomeQuintile=4;l.rng=7;
 const next=graduate(advanceTimeline(l,1));assert.ok(next.timeline!.scheduledDecisions!.some(d=>d.id==='schoolWithdrawal-16'));
 next.country=getCountryById('UGA');const skipped=advanceTimeline(next,1);assert.equal(skipped.academics!.secondaryProgress!.pending,null);
});
