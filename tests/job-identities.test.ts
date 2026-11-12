import test from 'node:test';import assert from 'node:assert/strict';
import {OCCUPATION_IDS} from '../src/game/occupations';
import {JOB_IDS,WORK_JOB_IDS,occupationJob,OCCUPATION_NAMES} from '../src/game/job-identities';
import {translator} from '../src/lib/i18n';
import {createNewGame} from '../src/game/new-game';import {DEFAULT_SETTINGS} from '../src/game/engine';
import {encodeSave,decodeSave} from '../src/game/storage';
test('every canonical occupation has a distinct display identity without changing legacy service',()=>{
 const t=translator('en');assert.equal(occupationJob('service'),'conscription');
 assert.notEqual(t('job.service'),t('job.conscription'));
 assert.equal(new Set(OCCUPATION_IDS.map(occupationJob)).size,OCCUPATION_IDS.length);
 for(const id of OCCUPATION_IDS){assert.ok(JOB_IDS.includes(occupationJob(id)));assert.ok(OCCUPATION_NAMES[id]);assert.notEqual(t(`job.${occupationJob(id)}`),`job.${occupationJob(id)}`);}
});
test('new occupational identities and original generic service survive save round trips',()=>{
 for(const job of ['doctor','dev','conscription','service'] as const){
  const life=createNewGame({...DEFAULT_SETTINGS,country:'JPN'},1);life.stats.job=job;
  assert.equal(decodeSave(encodeSave(life,[])).life!.stats.job,job);
 }
});

test('nonworking source identities cannot become paid offers or occupational career entries',()=>{
 for(const job of ['seeking','prison','dayc','homemaker','conscription'] as const){
  assert.equal(WORK_JOB_IDS.includes(job),false);
  const life=createNewGame({...DEFAULT_SETTINGS,country:'JPN'},1);life.career.push({age:0,job});
  assert.throws(()=>decodeSave(encodeSave(life,[])));
 }
 assert.equal(WORK_JOB_IDS.includes('service'),true);
});
