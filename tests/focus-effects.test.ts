import test from 'node:test';
import assert from 'node:assert/strict';
import {settleFocusStats,normalizeFocusTime} from '../src/game/focus-effects';
const stats={health:50,happiness:50,social:50};

test('weighted health and work settle once, with age-dependent health benefits',()=>{
 assert.deepEqual(settleFocusStats(stats,70,{health:1,work:1}),{health:50,happiness:49.5,social:49});
 assert.deepEqual(stats,{health:50,happiness:50,social:50});
 for(const [age,gain] of [[49,5],[50,4],[64,4],[65,3],[74,3],[75,2.25],[84,2.25],[85,1.5]])
  assert.equal(settleFocusStats(stats,age,{health:1}).health,50+gain);
});
test('focus deltas clamp in chronological focus order and never invent knowledge gains',()=>{
 assert.deepEqual(settleFocusStats({...stats,health:99},30,{health:1,work:1}),{health:98.5,happiness:49.5,social:49});
 assert.equal(settleFocusStats({...stats,health:99},30,{work:1,health:1}).health,100);
 assert.deepEqual(settleFocusStats(stats,12,{study:1}),{health:50,happiness:49,social:49});
});
test('time normalization supports empty years, ignores zero time and rejects corrupt ledgers',()=>{
 assert.deepEqual(normalizeFocusTime({study:1,play:3,rest:0}),{study:.25,play:.75});
 assert.deepEqual(normalizeFocusTime({}),{});
 for(const time of [{study:-1},{study:Infinity},{unknown:1},{study:NaN}])assert.throws(()=>normalizeFocusTime(time as any));
});
