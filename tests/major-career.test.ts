import test from 'node:test';import assert from 'node:assert/strict';
import {majorAllowsJob,crossMajorJobWeight,majorJobEducationRequirement} from '../src/game/major-career';
import {MAJOR_IDS} from '../src/game/university-major';
test('professional jobs require the observed matching majors for known graduates',()=>{
 for(const major of MAJOR_IDS){const facts={education:4,major};
  assert.equal(majorAllowsJob(facts,'nurse'),['med','nurse'].includes(major));
  assert.equal(majorAllowsJob(facts,'engineer'),['eng','cs','sci','arch'].includes(major));
  assert.equal(majorAllowsJob(facts,'doctor'),major==='med');
  assert.equal(majorAllowsJob(facts,'lawyer'),major==='law');
  assert.equal(majorAllowsJob(facts,'healthtech'),['med','nurse','sci'].includes(major));
  assert.equal(majorAllowsJob(facts,'teacher'),true);
 }
});
test('ordinary legacy unknowns differ from aspiration evidence and unfinished degrees',()=>{
 assert.equal(majorAllowsJob({education:4},'nurse'),true);
 assert.equal(majorAllowsJob({education:4},'nurse','aspiration'),false);
 assert.equal(majorAllowsJob({education:3,major:'nurse'},'nurse','aspiration'),false);
 assert.equal(majorAllowsJob({education:4,major:'nurse'},'nurse','aspiration'),true);
});
test('cross-major paths retain fractional weights and coding qualification only bypasses developer penalty',()=>{
 assert.equal(crossMajorJobWeight({education:4,major:'hum'},'dev'),.12);
 assert.equal(crossMajorJobWeight({education:4,major:'hum',codingQualified:true},'dev'),1);
 assert.equal(crossMajorJobWeight({education:4,major:'hum',codingQualified:true},'designer'),.15);
 assert.equal(crossMajorJobWeight({education:4,major:'hum'},'finance'),.5);
 assert.equal(crossMajorJobWeight({education:4,major:'pe'},'finance'),.1);
 assert.equal(crossMajorJobWeight({education:4,major:'nurse'},'social'),.8);
 assert.equal(crossMajorJobWeight({education:4,major:'cs'},'finance'),1);
 assert.equal(crossMajorJobWeight({education:3,major:'hum'},'dev'),1);
 assert.equal(crossMajorJobWeight({education:4},'dev'),1);
});
test('completed medicine and law degrees change their own professional education requirement only',()=>{
 assert.equal(majorJobEducationRequirement({education:4,major:'med'},'doctor',5),4);
 assert.equal(majorJobEducationRequirement({education:4,major:'law'},'lawyer',5),4);
 assert.equal(majorJobEducationRequirement({education:4,major:'law'},'doctor',5),5);
 assert.equal(majorJobEducationRequirement({education:3,major:'med'},'doctor',5),5);
});
