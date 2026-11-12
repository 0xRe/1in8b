import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {naturalFamily,familyChoice} from './helpers/adult-family-simulation';
import {encodeSave,decodeSave} from '../src/game/storage';
import {FamilyDescendants} from '../src/components/FamilyDescendants';
import {translator} from '../src/lib/i18n';
const base=[...naturalFamily(1)].find(l=>l.family.children.some(c=>c.alive&&c.age===20)&&!l.pendingDecision)!;
function fixture(){
 const life=structuredClone(base),child=life.family.children.find(c=>c.alive&&c.age===20)!;
 const state=life.descendants.children.find(c=>c.childId===child.id)!;
 assert.equal(state.spouse,null);
 state.unionPlan={version:1,observedYear:life.year,orientation:'unknown',sameSexPartner:null,cohabitationAge:21,cohabitationYear:null,fertilityTarget:null};
 return {life,id:child.id};
}
test('annual engine observes saved cohabitation once and reload preserves its event and year',()=>{
 let {life,id}=fixture();const start=life.year;
 for(let step=0;step<100&&life.alive&&life.year<start+3;step++){
  life=familyChoice(life);life=decodeSave(encodeSave(life,[])).life!;
 }
 const state=life.descendants.children.find(c=>c.childId===id)!;
 assert.equal(state.unionPlan!.cohabitationYear,start+1);
 const child=life.family.children.find(c=>c.id===id)!;
 const events=life.events.filter(e=>e.key==='event.descendantCohabitation'&&e.params.name===child.name);
 assert.equal(events.length,1);
 assert.equal(events[0].age, start+1-life.birthYear);
});
test('family display distinguishes planned cohabitation from an observed historical transition',()=>{
 const {life,id}=fixture();const state=life.descendants.children.find(c=>c.childId===id)!;
 const render=()=>renderToStaticMarkup(React.createElement(FamilyDescendants,{life,locale:'en',t:translator('en')}));
 assert.ok(!render().includes('Began living with a partner'));
 state.unionPlan!.cohabitationYear=life.year;
 assert.ok(render().includes(`Began living with a partner in ${life.year}`));
});

test('a child who dies before the planned union never records cohabitation',()=>{
 let life=[...naturalFamily()].find(l=>l.family.children.some(c=>c.alive&&c.age===20)&&!l.pendingDecision)!;
 const child=life.family.children.find(c=>c.alive&&c.age===20)!;
 const id=child.id,start=life.year;
 const state=life.descendants.children.find(c=>c.childId===id)!;
 state.unionPlan={version:1,observedYear:start,orientation:'unknown',sameSexPartner:null,cohabitationAge:21,cohabitationYear:null,fertilityTarget:null};
 for(let step=0;step<100&&life.alive&&life.year<start+3;step++)life=decodeSave(encodeSave(familyChoice(life),[])).life!;
 assert.equal(life.family.children.find(c=>c.id===id)!.alive,false);
 assert.equal(life.descendants.children.find(c=>c.childId===id)!.unionPlan!.cohabitationYear,null);
 assert.ok(!life.events.some(e=>e.key==='event.descendantCohabitation'&&e.params.name===child.name));
});
