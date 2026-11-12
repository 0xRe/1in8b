import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily,familyChoice} from './helpers/adult-family-simulation';
import {decodeSave,encodeSave} from '../src/game/storage';
test('yearly gameplay runs distinct feed slots even when milestones occur and survives backups',()=>{
 const lives=[...naturalFamily(1)];
 for(const age of [1,5,6,18]){
  const life=lives.find(l=>l.age===age&&l.feed?.plan?.year===l.year&&l.feed.plan.queue.length===0)!;
  assert.ok(life,`age${age} must plan its ordinary feed`);
  assert.equal(life.feed!.plan!.queue.length,0);
  const ids=Object.entries(life.feed!.lastYears).filter(([,year])=>year===life.year).map(([id])=>id);
  assert.equal(ids.length,age<6?2:3);
  const restored=decodeSave(encodeSave(life,[])).life!;
  assert.deepEqual(familyChoice(restored),familyChoice(life));
 }
});

test('natural child custody dispatches a visit through the annual feed and preserves its continuation',()=>{
 const life=[...naturalFamily(17,6,'USA')].find(l=>l.feed?.lastYears.kidpr_v===l.year);
 assert.ok(life,'a naturally sentenced child receives an ordinary feed visit');
 assert.ok(life.events.some(e=>e.age===life.age&&['event.childPrisonVisit','event.childPrisonLetter','event.childPrisonConcern'].includes(e.key)));
 assert.equal(life.feed!.recent.filter(id=>id==='kidpr_v').length,1);
 const restored=decodeSave(encodeSave(life,[])).life!;
 assert.deepEqual(familyChoice(restored),familyChoice(life));
});
