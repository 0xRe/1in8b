import test from 'node:test';
import assert from 'node:assert/strict';
import {childWeddingHome} from '../src/game/child-wedding-home';
const context={country:'USA',region:'hi',sex:'M' as const,independent:false,staying:false,parentImprisoned:false,childImprisoned:false,lastChild:true,otherStaying:false};
const noDraw=()=>{throw Error('unexpected residence draw');};
test('weddings preserve existing homes and postpone unresolved custody households without drawing',()=>{
 assert.equal(childWeddingHome({...context,independent:true},noDraw),'independent');
 assert.equal(childWeddingHome({...context,staying:true},noDraw),'stay');
 assert.equal(childWeddingHome({...context,parentImprisoned:true},noDraw),'pending');
 assert.equal(childWeddingHome({...context,childImprisoned:true},noDraw),'pending');
 assert.equal(childWeddingHome({...context,lastChild:false},noDraw),'leave');
});
test('wedding stay probability follows country family rules and last-child gates',()=>{
 assert.equal(childWeddingHome(context,()=>.039),'stay');
 assert.equal(childWeddingHome(context,()=>.04),'leave');
 const china={...context,country:'CHN',region:'eap',lastChild:false};
 assert.equal(childWeddingHome(china,()=>.59),'stay');
 assert.equal(childWeddingHome(china,()=>.6),'leave');
 assert.equal(childWeddingHome({...china,sex:'F'},noDraw),'leave');
 assert.equal(childWeddingHome({...china,otherStaying:true},noDraw),'leave');
 assert.equal(childWeddingHome({...context,country:'JPN',region:'eap'},()=>.24),'stay');
 assert.equal(childWeddingHome({...context,country:'JPN',region:'eap'},()=>.25),'leave');
 assert.equal(childWeddingHome({...context,country:'TUR',region:'eca',lastChild:false},()=>.69),'stay');
 assert.equal(childWeddingHome({...context,country:'IND',region:'sa',lastChild:false},()=>.84),'stay');
});
