import test from 'node:test';import assert from 'node:assert/strict';
import {studyOnwardDestination,type StudyOnwardContext} from '../src/game/study-onward';
const context:StudyOnwardContext={studyCountry:'USA',birthCountry:'JPN',originalName:'A',alreadyMigrated:false,freeExit:true,papersValid:true,destinationOpen:()=>true};
test('onward choices follow stable original-name weights without reading game RNG',()=>{
 assert.equal(studyOnwardDestination(context),'AUS');
 assert.equal(studyOnwardDestination({...context,originalName:'B'}),'ARE');
 for(let i=0;i<10;i++)assert.equal(studyOnwardDestination(context),'AUS');
});
test('blocked and birth destinations are filtered before weighting',()=>{
 assert.equal(studyOnwardDestination({...context,destinationOpen:c=>c==='CAN'}),'CAN');
 assert.equal(studyOnwardDestination({...context,birthCountry:'CAN',destinationOpen:c=>c==='CAN'}),null);
 assert.equal(studyOnwardDestination({...context,destinationOpen:()=>false}),null);
});
test('migration, papers, exit and low-income host gates cannot expose an onward option',()=>{
 for(const patch of [{alreadyMigrated:true},{papersValid:false},{freeExit:false},{studyCountry:'XXX'},{studyCountry:'IND'}]){
  assert.equal(studyOnwardDestination({...context,...patch,destinationOpen:()=>{throw Error('ineligible context should not inspect destinations');}}),null);
 }
});
test('hosts without an explicit table use the reference fallback destinations',()=>{
 assert.equal(studyOnwardDestination({...context,studyCountry:'CHE',destinationOpen:c=>c==='DEU'}),'DEU');
 assert.equal(studyOnwardDestination({...context,studyCountry:'DEU',destinationOpen:c=>c==='DEU'}),null);
});
