import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily,findFamilyCheckpoint} from './helpers/adult-family-simulation';
import {decodeSave,encodeSave} from '../src/game/storage';
const observed=[...naturalFamily()].find(l=>l.descendants.grandchildren.length>0)!;
function fixture(){const life=structuredClone(observed),baby=life.descendants.grandchildren[0];return {life,baby,parent:life.family.children.find(p=>p.id===baby.parentId)!,state:life.descendants.children.find(p=>p.childId===baby.parentId)!};}
test('ordinary generated births record their observed formation and union',()=>{
 const {life,baby}=fixture();assert.deepEqual((baby as any).origin,{rulesVersion:2,method:'natural',union:'married',country:baby.country,household:'parent'});
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});
test('solo births round trip without inventing a spouse',()=>{
 const {life,baby,parent,state}=fixture();state.spouse=null;state.marriedYear=null;delete state.weddingHome;
 Object.assign(baby,{origin:{method:'natural',union:'solo',country:baby.country,household:parent.sex==='M'?'otherParent':'parent'}});
 assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
});
test('origin validation rejects invented countries, routes and adoption losses',()=>{
 const changes=[(o:any)=>o.country='XXX',(o:any)=>o.union='invalid',(o:any)=>o.method='invalid',(o:any)=>o.household='invalid'];
 for(const change of changes){const {life,baby}=fixture();Object.assign(baby,{origin:{method:'natural',union:'married',country:baby.country,household:'parent'}});change((baby as any).origin);assert.throws(()=>encodeSave(life,[]));}
 const {life,baby}=fixture();Object.assign(baby,{earlyLoss:true,alive:false,deathAge:null,fertilityTarget:0,origin:{method:'adoption',union:'married',country:baby.country,household:'parent'}});assert.throws(()=>encodeSave(life,[]));
});
test('other-parent household display does not claim the child lives with their father',async()=>{
 const {life,baby,parent,state}=fixture();parent.sex='M';state.spouse=null;state.marriedYear=null;delete state.weddingHome;
 Object.assign(baby,{origin:{method:'natural',union:'solo',country:baby.country,household:'otherParent'}});
 const React=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');const {FamilyDescendants}=await import('../src/components/FamilyDescendants');const {translator}=await import('../src/lib/i18n');
 const html=renderToStaticMarkup(React.createElement(FamilyDescendants,{life,locale:'en',t:translator('en')}));assert.ok(html.includes('Living with their mother'));
});
test('a father migrating does not move a minor living with their mother',async()=>{
 const {makeChoice}=await import('../src/game/engine');
 const life=findFamilyCheckpoint(l=>!!l.pendingDecision?.id.startsWith('descendant-migration-child-')&&l.descendants.grandchildren.some(g=>l.pendingDecision!.id.endsWith(`-${g.parentId}`)&&g.alive&&g.age<18));assert.ok(life);
 const baby=life.descendants.grandchildren.find(g=>life.pendingDecision!.id.endsWith(`-${g.parentId}`)&&g.alive&&g.age<18)!;
 const parent=life.family.children.find(c=>c.id===baby.parentId)!;parent.sex='M';
 const parentState=life.descendants.children.find(c=>c.childId===parent.id)!;if(parentState.unionPlan){parentState.unionPlan.orientation='unknown';parentState.unionPlan.sameSexPartner=parentState.spouse?parentState.spouse.sex===parent.sex:null;}
 baby.origin={method:'natural',union:'solo',country:baby.country,household:'otherParent'};
 const beforeCountry=baby.country;
 const after=makeChoice(decodeSave(encodeSave(life,[])).life!,'supportChildMove');
 assert.notEqual(after.family.children.find(c=>c.id===parent.id)!.country,beforeCountry);
 assert.equal(after.descendants.grandchildren.find(g=>g.id===baby.id)!.country,beforeCountry);
 assert.deepEqual(decodeSave(encodeSave(after,[])).life,after);
});
test('solo male non-natural formation retains the reference other-parent household flag',()=>{
 for(const method of ['adoption','surrogacy'] as const){
  const {life,baby,parent,state}=fixture();parent.sex='M';state.spouse=null;state.marriedYear=null;delete state.weddingHome;
  baby.origin={method,union:'solo',country:'USA',household:'otherParent'};
  assert.deepEqual(decodeSave(encodeSave(life,[])).life,life);
 }
});
