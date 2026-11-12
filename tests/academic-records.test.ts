import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS,advanceYear} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
import {qualificationLabel} from '../src/lib/qualification-label';
import {recordRows} from '../src/lib/record-export';
import {translator} from '../src/lib/i18n';
const t=translator('en');
test('new qualification labels distinguish degree levels while legacy meanings remain intact',()=>{
 assert.equal(qualificationLabel(3,undefined,t),'Vocational education');
 assert.equal(qualificationLabel(3,{qualification:3,doctorate:false},t),'Upper secondary or vocational qualification');
 assert.equal(qualificationLabel(4,{qualification:4,doctorate:false},t),"Bachelor’s degree");
 assert.equal(qualificationLabel(4,{qualification:5,doctorate:false},t),"Master’s degree");
 assert.equal(qualificationLabel(4,{qualification:5,doctorate:true},t),'Doctorate');
});
test('only observed annual records gain academic snapshots and mixed exports preserve old labels',()=>{
 let life=createLife({...DEFAULT_SETTINGS,country:'JPN',gentler:true,autoChoices:true},1);
 for(let i=0;i<1000&&life.age<30&&life.alive;i++)life=advanceYear(life);
 assert.equal(life.age,30);
 for(let i=0;i<100&&life.timeline&&!life.timeline.complete;i++)life=advanceYear(life);
 assert.equal(life.age,30);
 const history=structuredClone(life.history);
 life.academics={version:1,qualification:5,doctorate:true,medicine:false,studyCountry:null,enrollment:null};
 for(let i=0;i<100&&life.age===30;i++)life=advanceYear(life);
 assert.equal(life.age,31);
 // Between-year choices can update the current-age row; older ages must stay untouched.
 assert.deepEqual(life.history.slice(0,history.length-1),history.slice(0,-1));
 assert.deepEqual(life.history.at(-1)!.annual!.academic,{qualification:5,doctorate:true});
 const restored=decodeSave(encodeSave(life,[])).life!;
 assert.deepEqual(restored.history,life.history);
 const rows=recordRows(restored,t);
 assert.equal(rows.at(-1)![9],'Doctorate');
 assert.equal(rows[history.length-1][9],t(`education${history.at(-2)!.annual!.education}`));
});
test('invalid historical academic snapshots are rejected',()=>{
 const life=advanceYear(createLife(DEFAULT_SETTINGS,1));
 for(const academic of [null,{}, {qualification:6,doctorate:false},{qualification:4,doctorate:true},{qualification:5,doctorate:'yes'}]){
  const bad=structuredClone(life);bad.history.at(-1)!.annual!.academic=academic as any;
  assert.throws(()=>decodeSave(JSON.stringify({version:1,life:bad,past:[]})));
 }
});

test('biographies use attained academic qualifications without rewriting legacy narratives',async()=>{
 const {generateBiography}=await import('../src/lib/ending-story');
 const life=createLife(DEFAULT_SETTINGS,9);life.age=50;life.stats.education=3;
 assert.ok(generateBiography(life,'en',t).includes(t('bio.educationVocational')));
 life.academics={version:1,qualification:5,doctorate:true,medicine:false,studyCountry:null,enrollment:null};
 const bio=generateBiography(life,'en',t);
 assert.ok(bio.includes('Education: Doctorate.'));
 assert.ok(!bio.includes(t('bio.educationVocational')));
 assert.ok(generateBiography(life,'ja',translator('ja')).includes('博士号'));
 life.academics.doctorate=false;
 assert.ok(generateBiography(life,'en',t).includes('Education: Master’s degree.'));
});
