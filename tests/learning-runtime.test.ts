import test from 'node:test';import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS,spend} from '../src/game/engine';
import {createLearningState,drawTalents,applyLearningGain} from '../src/game/learning-state';
import {custodyFeedCandidates} from '../src/game/custody-feed';
function student(){const life=createLife({...DEFAULT_SETTINGS,country:'JPN'},4);life.age=20;life.year=life.birthYear+20;life.stats.savings=100000;life.learning=createLearningState(20,drawTalents(()=>.5),72);return life;}
test('education spending updates latent effort and visible knowledge together without changing the input',()=>{
 const before=student(),copy=structuredClone(before),amount=before.country.ppp*.02;
 const expected=applyLearningGain(before.learning!,before.age,1);
 const after=spend(before,'education',amount);
 assert.ok(Math.abs(after.learning!.effort-expected.state.effort)<1e-7);
 assert.ok(Math.abs(after.stats.knowledge-expected.knowledge)<.011);
 assert.deepEqual(before,copy);assert.equal(after.rng,before.rng);
});
test('custody library learning uses the same latent gain path, while legacy lives keep their original numeric semantics',()=>{
 for(const modern of [true,false]){
  const life=student();life.justice.prisonUntil=25;if(!modern)delete life.learning;
  const initial=life.stats.knowledge,expected=modern?applyLearningGain(life.learning!,20,4):null;
  const candidate=custodyFeedCandidates(life,{random:()=>0,event:()=>{}}).find(c=>c.id==='pr_learn')!;
  candidate.run();
  if(expected){assert.deepEqual(life.learning,expected.state);assert.equal(life.stats.knowledge,expected.knowledge);}
  else assert.equal(life.stats.knowledge,initial+4);
 }
});
