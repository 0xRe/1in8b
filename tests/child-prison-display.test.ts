import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {FamilyDescendants} from '../src/components/FamilyDescendants';
import {translator} from '../src/lib/i18n';
import {naturalFamily} from './helpers/adult-family-simulation';
test('family card presents custody and suspended income instead of ordinary home and employment',()=>{
 const life=[...naturalFamily(1)].find(l=>!l.pendingDecision&&l.family.children.some(c=>c.alive&&c.age===25))!;
 const child=life.family.children.find(c=>c.alive&&c.age===25)!;
 const state=life.descendants.children.find(c=>c.childId===child.id)!;
 state.prison={startYear:life.year-1,endYear:life.year+1,releasedYear:null};
 const before=structuredClone(life);
 const markup=renderToStaticMarkup(React.createElement(FamilyDescendants,{life,locale:'en',t:translator('en')}));
 assert.ok(markup.includes(`In prison until ${life.year+1}`));
 assert.ok(markup.includes('Employment paused during custody'));
 assert.ok(markup.includes('No earnings during custody'));
 assert.deepEqual(life,before);
});
