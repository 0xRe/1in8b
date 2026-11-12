import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS,makeChoice} from '../src/game/engine';
function excluded(){
 const life=createLife({...DEFAULT_SETTINGS,country:'JPN'},124);
 life.age=8;life.year+=8;life.schooling.enrolled=false;life.schooling.droppedOut=true;
 life.stats.social=40;life.stats.knowledge=30;life.stats.happiness=60;life.stats.incomeQuintile=1;
 life.pendingDecision={id:'school',type:'choice',age:8,params:{},key:'decision.school',choices:[{id:'returnSchool',key:'choice.returnSchool'},{id:'helpFamily',key:'choice.helpFamily'}]};
 return life;
}
test('helping family preserves knowledge while granting four social points',()=>{
 const life=excluded(),before=structuredClone(life),result=makeChoice(life,'helpFamily');
 assert.equal(result.stats.knowledge,30);assert.equal(result.stats.social,44);assert.equal(result.stats.happiness,60);
 assert.deepEqual(life,before);
});
test('failed school requests reduce happiness, not knowledge or social ties',()=>{
 let failures=0;
 for(let seed=1;seed<=20;seed++){
  const life=excluded();life.rng=seed;
  const result=makeChoice(life,'returnSchool');
  if(result.schooling.enrolled)continue;
  failures++;
  assert.equal(result.stats.happiness,55);assert.equal(result.stats.knowledge,30);assert.equal(result.stats.social,40);
  assert.ok(result.events.some(e=>e.key==='event.schoolReturnRejected'));
 }
 assert.ok(failures>0,'low-income requests must sometimes fail');
});
