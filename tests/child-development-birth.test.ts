import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {addChildProgress} from '../src/game/descendants';
import {encodeSave,decodeSave} from '../src/game/storage';

test('newborn children receive persisted birth descriptors once through normal gameplay',()=>{
 const life=[...naturalFamily(124)].find(l=>l.family.children.some(c=>c.age===0))!;
 const child=life.family.children.find(c=>c.age===0)!;
 const state=life.descendants.children.find(s=>s.childId===child.id)!;
 assert.ok((state as any).birthDevelopment,'new child birth facts must be explicit');
 const before=structuredClone(life);
 assert.equal(addChildProgress(life,child),state);assert.deepEqual(life,before);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});
test('legacy child records stay unknown and malformed descriptors cannot be imported',()=>{
 const life=[...naturalFamily(124)].find(l=>l.family.children.some(c=>c.age===0))!;
 const child=life.family.children.find(c=>c.age===0)!;
 const state=life.descendants.children.find(s=>s.childId===child.id)!;
 delete (state as any).birthDevelopment;
 assert.equal((addChildProgress(life,child,true) as any).birthDevelopment,undefined);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 (state as any).birthDevelopment={version:99,developmental:null,attentionLearning:null};
 assert.throws(()=>encodeSave(life,[]));
});
