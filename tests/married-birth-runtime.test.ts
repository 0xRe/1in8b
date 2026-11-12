import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily} from './helpers/adult-family-simulation';
import {encodeSave,decodeSave} from '../src/game/storage';
test('new married births identify their rule version and survive backup',()=>{
 const life=[...naturalFamily()].find(l=>l.descendants.grandchildren.some(g=>g.origin?.union==='married'))!;
 const baby=life.descendants.grandchildren.find(g=>g.origin?.union==='married')!;
 assert.equal((baby.origin as any).rulesVersion,2);
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 (baby.origin as any).rulesVersion=999;assert.throws(()=>encodeSave(life,[]));
});
test('natural married families can welcome children in consecutive years',()=>{
 let found=false;
 for(let seed=1;seed<=30&&!found;seed++)for(const life of naturalFamily(seed)){
  const babies=life.descendants.grandchildren.filter(g=>g.origin?.union==='married');
  if(!babies.some(a=>babies.some(b=>a.parentId===b.parentId&&b.birthYear===a.birthYear+1)))continue;
  found=true;assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);break;
 }
 assert.ok(found,'exercise consecutive years without injected babies');
});
test('versioned married births permit the wedding year while legacy chronology stays strict',()=>{
 const life=[...naturalFamily()].find(l=>l.descendants.grandchildren.length>0)!;
 const baby=life.descendants.grandchildren[0];
 const parent=life.descendants.children.find(c=>c.childId===baby.parentId)!;
 assert.equal(baby.origin?.union,'married');
 delete parent.weddingHome; // This fixture changes historical marriage chronology, not a recorded household decision.
 parent.marriedYear=baby.birthYear;
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 delete baby.origin!.rulesVersion;
 assert.throws(()=>encodeSave(life,[]),'unversioned historical births retain prior-year marriage requirement');
 baby.origin!.rulesVersion=2;
 parent.marriedYear=baby.birthYear+1;
 assert.throws(()=>encodeSave(life,[]),'new rules still reject birth before marriage');
});
