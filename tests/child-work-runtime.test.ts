import test from 'node:test';import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS,makeChoice,advanceYear,addReflection} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
import {childWorkIncome} from '../src/game/income-distribution';
function excluded(paid:boolean){
 let life=createLife({...DEFAULT_SETTINGS,country:'JPN'},124);
 const resolve=(l:typeof life)=>!l.pendingDecision?l:l.pendingDecision.type==='reflection'?addReflection(l,''):makeChoice(l,l.pendingDecision.choices[0].id);
 while(life.age<7)life=advanceYear(resolve(life));
 while(life.pendingDecision)life=resolve(life);
 life.schooling.enrolled=false;life.schooling.droppedOut=true;
 while(life.age===7)life=advanceYear(resolve(life));
 life.schooling.enrolled=false;life.schooling.droppedOut=true;life.schooling.childLabor=true;
 Object.assign(life.schooling,{childWorkPaid:paid});
 life.pendingDecision={id:'school',type:'choice' as const,age:8,key:'decision.school',params:{},choices:[{id:'helpFamily',key:'choice.helpFamily',params:{}}]};
 return life;
}
test('paid and unpaid childhood work retain distinct income and survive real save decoding',()=>{
 for(const paid of [false,true]){
  const result=makeChoice(excluded(paid),'helpFamily');
  assert.equal(result.stats.job,'childwork');
  assert.equal(result.stats.annualIncome,Math.round(childWorkIncome(result.country,paid)*100)/100);
  const saved=decodeSave(encodeSave(result,[])).life!;
  assert.equal((saved.schooling as any).childWorkPaid,paid);
  assert.equal(saved.stats.job,'childwork');
 }
});
test('annual settlement preserves both child-work wages without career growth or a farmer conversion',()=>{
 for(const paid of [false,true]){
 let life=makeChoice(excluded(paid),'helpFamily');const age=life.age, income=life.stats.annualIncome;
 for(let i=0;i<40&&life.alive&&life.age===age;i++){
  if(life.pendingDecision)life=life.pendingDecision.type==='reflection'?addReflection(life,''):makeChoice(life,life.pendingDecision.choices[0].id);
  else life=advanceYear(life);
 }
 assert.equal(life.age,age+1);assert.equal(life.stats.annualIncome,income);assert.equal(life.stats.job,'childwork');
 assert.equal(decodeSave(encodeSave(life,[])).life!.schooling.childWorkPaid,paid);
 }
});
test('invalid child-work payment markers are rejected without inventing old save markers',()=>{
 const original=createLife(DEFAULT_SETTINGS,42);
 const legacy=decodeSave(encodeSave(original,[])).life!;assert.equal((legacy.schooling as any).childWorkPaid,undefined);
 const invalid=JSON.parse(encodeSave(original,[]));invalid.life.schooling.childWorkPaid='false';
 assert.throws(()=>decodeSave(JSON.stringify(invalid)));
});
test('existing paid child-labor saves migrate during play without losing their earned-work status',()=>{
 let life=excluded(true);delete life.schooling.childWorkPaid;
 life.pendingDecision=null;life.stats.job='farmer';life.stats.employment='employed';life.stats.annualIncome=100;
 life=decodeSave(encodeSave(life,[])).life!;
 assert.equal(life.schooling.childWorkPaid,undefined);
 const age=life.age;
 for(let i=0;i<40&&life.alive&&life.age===age;i++)life=advanceYear(life);
 assert.equal(life.stats.job,'childwork');assert.equal(life.schooling.childWorkPaid,true);
 assert.ok(life.stats.annualIncome>0);
});
