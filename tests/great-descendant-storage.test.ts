import test from 'node:test';
import assert from 'node:assert/strict';
import { naturalFamily, findFamilyCheckpoint } from './helpers/adult-family-simulation';
import { decodeSave, encodeSave } from '../src/game/storage';
const observed=findFamilyCheckpoint(l=>l.descendants.grandchildren.some(g=>g.alive&&g.age>=25))!;
function fixture(){
 const life=structuredClone(observed);assert.ok(life);
 const parent=life.descendants.grandchildren.find(g=>g.alive&&g.age>=25)!;
 parent.fertilityTarget=Math.max(1,parent.fertilityTarget??0);
 life.descendants.greatGrandchildren=[{id:'great-fixture',grandchildId:parent.id,name:'Younger generation',sex:'F',country:parent.country,age:1,birthYear:life.year-1,alive:true,deathAge:null}];
 return life;
}
test('coherent optional great-grandchildren survive export and import',()=>{
 const life=fixture();assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});
test('great-grandchild imports reject broken identity, lineage, country and chronology',()=>{
 const changes=[
  (l:any)=>l.descendants.greatGrandchildren[0].grandchildId='missing-parent',
  (l:any)=>l.descendants.greatGrandchildren[0].id=l.descendants.grandchildren[0].id,
  (l:any)=>l.descendants.greatGrandchildren.push({...l.descendants.greatGrandchildren[0]}),
  (l:any)=>l.descendants.greatGrandchildren[0].country='invalid',
  (l:any)=>l.descendants.greatGrandchildren[0].age=2,
  (l:any)=>l.descendants.greatGrandchildren[0].deathAge=1,
  (l:any)=>{const g=l.descendants.greatGrandchildren[0];g.alive=false;g.deathAge=null;},
  (l:any)=>{const g=l.descendants.greatGrandchildren[0];g.birthYear=l.descendants.grandchildren.find((p:any)=>p.id===g.grandchildId).birthYear+10;g.age=l.year-g.birthYear;},
 ];
 for(const change of changes){const life=fixture();change(life);assert.throws(()=>decodeSave(JSON.stringify({version:1,life,past:[]})),String(change));}
});

test('deceased great-grandchildren keep their death age rather than aging on import',()=>{
 const life=fixture(),g=life.descendants.greatGrandchildren![0];
 g.birthYear=life.year-3;g.age=1;g.alive=false;g.deathAge=1;
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 g.deathAge=2;
 assert.throws(()=>decodeSave(JSON.stringify({version:1,life,past:[]})));
});
