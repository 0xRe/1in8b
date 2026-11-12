import test from 'node:test';
import assert from 'node:assert/strict';
import {automaticRetakeProbability as probability} from '../src/game/school-admissions';
test('automatic preparation reflects exam systems, means and declining repeat willingness',()=>{
 assert.equal(typeof probability,'function');
 assert.equal(probability('JPN',0,5),.6);
 assert.equal(probability('JPN',1,5),.3);
 assert.equal(probability('JPN',2,5),.18);
 assert.equal(probability('USA',0,5),.3);
 assert.equal(probability('USA',0,2),.175);
 assert.equal(probability('JPN',0,2),.35);
});
