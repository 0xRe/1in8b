import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife, DEFAULT_SETTINGS, advanceYear} from '../src/game/engine';
import {encodeSave, decodeSave} from '../src/game/storage';

test('annual snapshots retain personal income separately from household income', () => {
 let life=createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true,autoChoices:true},1);
 let sawHouseholdDifference=false;
 for(let i=0;i<600&&life.alive;i++) {
  life=advanceYear(life);
  const annual=life.history.at(-1)!.annual!;
  assert.equal(annual.personalIncome,life.stats.annualIncome);
  if(annual.income!==annual.personalIncome)sawHouseholdDifference=true;
 }
 assert.ok(sawHouseholdDifference);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life!.history,life.history);
});
test('legacy personal income stays unknown and malformed observations are rejected',()=>{
 const life=advanceYear(createLife(DEFAULT_SETTINGS,1));
 for(const row of life.history)if(row.annual)delete row.annual.personalIncome;
 const restored=decodeSave(encodeSave(life,[])).life!;
 assert.ok(restored.history.every(row=>!row.annual || row.annual.personalIncome===undefined));
 for(const income of [-1,null,'100',1e14]) {
  const bad=structuredClone(life);
  bad.history.at(-1)!.annual!.personalIncome=income as any;
  assert.throws(()=>decodeSave(JSON.stringify({version:1,life:bad,past:[]})));
 }
});
