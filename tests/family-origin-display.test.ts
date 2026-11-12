import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {naturalFamily} from './helpers/adult-family-simulation';
import {FamilyDescendants} from '../src/components/FamilyDescendants';
import {translator} from '../src/lib/i18n';
const base=[...naturalFamily()].find(l=>l.descendants.grandchildren.length>0)!;
const render=(life:typeof base)=>renderToStaticMarkup(React.createElement(FamilyDescendants,{life,locale:'en',t:translator('en')}));
test('family rows expose recorded parent formation without changing saved state',()=>{
 for(const [method,text] of [['adoption','Joined the family through adoption'],['donor','Born with donor assistance'],['surrogacy','Born through surrogacy']] as const){
  const life=structuredClone(base),baby=life.descendants.grandchildren[0];
  baby.origin={method,union:'married',country:baby.country,household:'parent'};
  const before=JSON.stringify(life);
  assert.ok(render(life).includes(text),method);
  assert.equal(JSON.stringify(life),before);
 }
});
test('unknown and ordinary birth origins do not invent an assisted formation label',()=>{
 for(const legacy of [true,false]){
  const life=structuredClone(base);if(legacy)delete life.descendants.grandchildren[0].origin;
  assert.doesNotMatch(render(life),/Joined the family through adoption|Born with donor assistance|Born through surrogacy|family\.formation/);
 }
});
