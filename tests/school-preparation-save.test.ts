import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {encodeSave,decodeSave} from '../src/game/storage';
function fixture(){
 const life=structuredClone([...naturalFamily(1)].find(l=>l.age>=30&&!l.pendingDecision&&(!l.timeline||l.timeline.complete))!);
 life.academics={version:1,qualification:3,doctorate:false,medicine:false,studyCountry:'JPN',enrollment:{stage:'university',completedYears:0,lastSettledAge:life.age,paused:false,graduationPending:false,preparationYears:1}};
 life.schooling.enrolled=true;life.stats.job='student';life.stats.employment='student';life.stats.annualIncome=0;return life;
}
test('language preparation survives export and rejects malformed or post-credit preparation',()=>{
 const life=fixture();assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 for(const change of [{preparationYears:2},{preparationYears:-1},{preparationYears:1,completedYears:1},{stage:'primary',preparationYears:1}]){
  const bad=structuredClone(life);Object.assign(bad.academics!.enrollment!,change);
  assert.throws(()=>decodeSave(encodeSave(bad,[])));
 }
});
