import test from 'node:test';
import assert from 'node:assert/strict';
import {naturalFamily,familyChoice} from './helpers/adult-family-simulation';
import {encodeSave,decodeSave} from '../src/game/storage';
import {makeChoice} from '../src/game/engine';
import {translator} from '../src/lib/i18n';
for(const sameSex of [false,true]) test(`cohabiting family births without a spouse record; sameSex=${sameSex}`,()=>{
 let life=[...naturalFamily()].find(l=>l.pendingDecision?.id.startsWith('descendant-wedding-child-'))!;
 const id=life.pendingDecision!.id.slice('descendant-wedding-'.length);
 const child=life.family.children.find(c=>c.id===id)!;
 const state=life.descendants.children.find(c=>c.childId===id)!;
 child.country='USA';state.residence='independent';state.weddingResolved=true;life.pendingDecision=null;
 state.unionPlan={version:1,observedYear:life.year,orientation:sameSex?'sameSex':'oppositeSex',sameSexPartner:sameSex,cohabitationAge:18,cohabitationYear:life.year,fertilityTarget:9};
 life=decodeSave(encodeSave(life,[])).life!;
 for(let step=0;step<250&&life.alive&&life.age<85;step++){
  life=life.pendingDecision?.id===`descendant-migration-${id}`?makeChoice(life,'childStay'):familyChoice(life);life=decodeSave(encodeSave(life,[])).life!;
 }
 const babies=life.descendants.grandchildren.filter(g=>g.parentId===id);
 assert.ok(babies.length>0,'cohabitation must permit actual births');
 for(const baby of babies){assert.equal(baby.origin?.union,'cohabiting');assert.equal(baby.origin?.method==='natural',!sameSex);}
 assert.equal(life.descendants.children.find(c=>c.childId===id)!.spouse,null);
 const event=life.events.find(e=>e.key==='event.descendantCohabitingBirth'&&e.params.name===child.name);
 assert.ok(event,'single birth uses partner wording');assert.ok(!translator('en')(event.key,event.params).includes('spouse'));
});
