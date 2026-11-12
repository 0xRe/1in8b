import test from 'node:test';import assert from 'node:assert/strict';
import {createNewGame} from '../src/game/new-game';import {DEFAULT_SETTINGS,makeChoice,advanceTimeline} from '../src/game/engine';
import {familyChoice} from './helpers/adult-family-simulation';import {encodeSave,decodeSave} from '../src/game/storage';
import {prepareOverseasApplication} from '../src/game/overseas-state';import {studyDecision} from '../src/game/study-choice-runtime';
function applicant(){let life=createNewGame({...DEFAULT_SETTINGS,country:'JPN',gentler:true,dailyThemeDay:'2026-10-20'},1);for(let n=0;n<150&&life.alive&&life.pendingDecision?.id!=='college-18';n++)life=familyChoice(life);assert.equal(life.pendingDecision?.id,'college-18');prepareOverseasApplication(life,[{country:'DEU',weight:1,admissionFactor:.85,policyFactor:1,scholarshipProbability:.06}],{fullScholarship:false,selfFunded:false},()=>0);life.pendingDecision=studyDecision(life);assert.ok(life.pendingDecision);return life;}
test('saved destination choices resolve through the public engine and cannot replay',()=>{
 const life=applicant();life.rng=7;const restored=decodeSave(encodeSave(life,[])).life!;
 const done=makeChoice(restored,'studyDestination0');assert.equal(done.academics!.overseasApplication!.status,'resolved');assert.equal(done.academics!.overseasApplication!.receipt!.result.outcome,'overseas');assert.equal(done.academics!.enrollment!.stage,'university');
 assert.ok(done.decisions.includes(`studyDestination-${life.age}`));assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
 assert.deepEqual(makeChoice(done,'studyDestination0'),done);
});
test('choosing home queues a domestic choice without reoffering overseas destinations',()=>{
 const life=applicant();let done=makeChoice(life,'studyHome');
 assert.equal(done.academics!.overseasApplication!.status,'cancelled');const fallback=studyDecision(done)!;
 assert.ok(fallback);assert.deepEqual(fallback.choices.map(c=>c.id),['studyApply','studyWork']);
 assert.ok(done.pendingDecision?.id===fallback.id||done.timeline?.scheduledDecisions?.some(d=>d.id===fallback.id));
 assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
 for(let step=0;step<20&&!done.pendingDecision;step++)done=advanceTimeline(done,1);assert.equal(done.pendingDecision?.id,fallback.id);const worked=makeChoice(done,'studyWork');assert.equal(worked.stats.employment,'unemployed');assert.equal(studyDecision(worked),null);
});
test('stale custody and forged destination quotes cannot trigger an application',()=>{
 const original=applicant();const imprisoned=structuredClone(original);imprisoned.justice.prisonUntil=imprisoned.age+1;
 const done=makeChoice(imprisoned,'studyDestination0');assert.equal(done.rng,imprisoned.rng);assert.equal(done.academics!.overseasApplication!.status,'pending');assert.equal(done.pendingDecision,null);
 const forged=structuredClone(original);forged.pendingDecision!.choices[0].params.amount=0;
 assert.throws(()=>decodeSave(encodeSave(forged,[])));
 const untouched=makeChoice(forged,'studyDestination0');assert.equal(untouched.rng,forged.rng);assert.equal(untouched.academics!.overseasApplication!.status,'pending');
});

test('public tuition financing failure preserves a readable save without granting study effects',()=>{
 const life=applicant();life.rng=7;life.stats.debt=1e12;life.stats.savings=0;
 const done=makeChoice(life,'studyDestination0');
 assert.equal(done.academics!.overseasApplication!.receipt!.result.outcome,'fundingUnavailable');
 assert.equal(done.stats.debt,1e12);assert.equal(done.academics!.enrollment,null);
 assert.equal(done.academics!.overseasResidence,undefined);
 assert.ok(done.events.some(e=>e.key==='event.study.fundingUnavailable'));
 assert.deepEqual(decodeSave(encodeSave(done,[])).life,done);
 assert.deepEqual(makeChoice(done,'studyDestination0'),done);
});
