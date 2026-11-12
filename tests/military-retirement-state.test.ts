import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareMilitaryRetirementRecord,commitMilitaryRetirementRecord} from '../src/game/military-retirement-state';
const context={age:52,rank:0 as const,commissioned:true,working:true,retired:false,handledAge:null,income:10000,percentile:.8,careerIncome:0,careerPercentile:null};
test('retirement preview survives repeats without recalculating or consuming another lottery',()=>{
 let calls=0;const calculate=()=>{calls++;return 4000};
 const record=prepareMilitaryRetirementRecord(undefined,context,calculate)!;
 assert.equal(record.status,'offered');assert.equal(record.offer.pensionPreview,4000);
 assert.deepEqual(prepareMilitaryRetirementRecord(record,context,calculate),record);assert.equal(calls,1);
});
test('resolved retirement receipts are immutable and reject repeated acceptance',()=>{
 const offered=prepareMilitaryRetirementRecord(undefined,context,()=>4000)!;
 const resolved=commitMilitaryRetirementRecord(offered,context,'retire',()=>4500)!;
 assert.equal(resolved.status,'resolved');assert.equal(resolved.outcome!.pension,4500);
 assert.equal(commitMilitaryRetirementRecord(resolved,context,'retire',()=>{throw Error('repeat draw')}),null);
 assert.deepEqual(prepareMilitaryRetirementRecord(resolved,{...context,age:53},()=>{throw Error('new offer after resolution')}),resolved);
 assert.equal(offered.status,'offered');
});
test('stale or no-longer-employed offers cannot resolve and a new eligible year gets a fresh preview',()=>{
 const record=prepareMilitaryRetirementRecord(undefined,context,()=>4000)!;
 assert.equal(commitMilitaryRetirementRecord(record,{...context,age:53},'retire',()=>{throw Error('stale draw')}),null);
 assert.equal(commitMilitaryRetirementRecord(record,{...context,working:false},'other',()=>0),null);
 const refreshed=prepareMilitaryRetirementRecord(record,{...context,age:53},()=>5000)!;
 assert.equal(refreshed.offer.age,53);assert.equal(refreshed.offer.pensionPreview,5000);
});
