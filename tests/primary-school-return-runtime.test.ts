import test from 'node:test';import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {advanceYear,advanceTimeline,makeChoice,addReflection} from '../src/game/engine';
import {decodeSave,encodeSave} from '../src/game/storage';
function fixture(){
 const l=structuredClone([...naturalFamily(1)].find(l=>l.age===7&&!l.pendingDecision)!);
 l.academics={version:1,qualification:0,doctorate:false,medicine:false,studyCountry:null,enrollment:null,primaryFacts:{rich:false,refugee:false,irregular:false,learningCentreOnly:false,absentParentIds:[]},primary:{entry:{age:6,kind:'outOfSchool',country:l.country.id}},circumstances:{homeSchool:false,learningCentre:false,topMarkAge:null,developmentalProtection:false,accessModifiers:{}}};
 l.schooling.enrolled=false;l.schooling.droppedOut=true;l.schooling.childLabor=true;l.schooling.childWorkPaid=false;
 l.stats.education=0;l.stats.job='childwork';l.stats.employment='employed';l.stats.annualIncome=0;l.stats.incomeQuintile=5;l.stats.social=100;
 for(let n=0;n<40&&l.age===7;n++){
  const next=l.pendingDecision?l.pendingDecision.type==='reflection'?addReflection(l,''):makeChoice(l,l.pendingDecision.choices[0].id):l.timeline&&!l.timeline.complete?advanceTimeline(l,1):advanceYear(l,.000001);
  Object.assign(l,next);
 }
 return advanceTimeline(l,1);
}
test('age-eight out-of-school academic lives receive a saved return decision and restart primary year zero',()=>{
 const l=fixture();assert.equal(l.pendingDecision?.id,'school');
 const done=makeChoice(decodeSave(encodeSave(l,[])).life!,'returnSchool');
 assert.equal(done.academics!.enrollment?.stage,'primary');assert.equal(done.academics!.enrollment!.completedYears,0);assert.equal(done.academics!.qualification,0);assert.equal(done.stats.education,0);
 assert.equal(done.stats.job,'student');assert.equal(done.schooling.childLabor,false);assert.equal(done.academics!.primary!.lateEntry!.outcome,'enrolled');
 assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);assert.deepEqual(makeChoice(done,'returnSchool'),done);
});
test('help and rejected requests preserve earned qualifications and do not manufacture school years',()=>{
 const l=fixture();l.stats.social=40;l.stats.incomeQuintile=1;
 const help=makeChoice(l,'helpFamily');assert.equal(help.rng,l.rng);assert.equal(help.stats.social,44);assert.equal(help.academics!.enrollment,null);assert.equal(help.stats.knowledge,l.stats.knowledge);
 let rejected:typeof l|null=null;
 for(let seed=1;seed<1000&&!rejected;seed++){const input=structuredClone(l);input.rng=seed;const result=makeChoice(input,'returnSchool');if(result.academics!.primary!.lateEntry?.outcome==='rejected')rejected=result;}
 assert.ok(rejected);assert.equal(rejected.stats.happiness,l.stats.happiness-5);assert.equal(rejected.stats.social,l.stats.social);assert.equal(rejected.academics!.qualification,0);assert.equal(rejected.academics!.enrollment,null);assert.deepEqual(decodeSave(encodeSave(rejected,[])).life,rejected);
});

test('late starters earn their primary qualification after six observed years and progress to secondary',()=>{
 let life=makeChoice(fixture(),'returnSchool');
 for(let n=0;n<150&&life.age<14;n++){
  assert.equal(life.academics!.qualification,0);
  life=decodeSave(encodeSave(life,[])).life!;
  life=life.pendingDecision?life.pendingDecision.type==='reflection'?addReflection(life,''):makeChoice(life,life.pendingDecision.choices[0].id):life.timeline&&!life.timeline.complete?advanceTimeline(life,1):advanceYear(life,.000001);
 }
 assert.equal(life.age,14);assert.equal(life.academics!.qualification,1);assert.equal(life.academics!.enrollment?.stage,'lowerSecondary');assert.equal(life.academics!.enrollment!.completedYears,0);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});

test('stale and forged academic return decisions cannot reroll admission',()=>{
 const pending=fixture();
 for(const mutate of [(l:typeof pending)=>{l.justice.prisonUntil=l.age+1;},(l:typeof pending)=>{l.academics!.qualification=1;},(l:typeof pending)=>{l.academics!.enrollment={stage:'primary',completedYears:1,lastSettledAge:7,paused:false,graduationPending:false};}]){
  const stale=structuredClone(pending);mutate(stale);const done=makeChoice(stale,'returnSchool');
  assert.equal(done.rng,stale.rng);assert.equal(done.pendingDecision,null);assert.equal(done.academics!.primary!.lateEntry,undefined);assert.throws(()=>encodeSave(stale,[]));
 }
 const done=makeChoice(pending,'returnSchool');done.academics!.primary!.lateEntry!.age=9 as never;assert.throws(()=>encodeSave(done,[]));
});
