import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {LifeDetails,LifeActions} from '../src/components/GameDetails';import {translator} from '../src/lib/i18n';import {createNewGame} from '../src/game/new-game';import {DEFAULT_SETTINGS} from '../src/game/engine';
function fixture(){const l=createNewGame({...DEFAULT_SETTINGS,country:'JPN'},41);l.age=20;l.hobbies=[{id:'art',skill:99,trainedAt:-1,progress:{since:7,level:2.35}},{id:'music',skill:70,trainedAt:-1,progress:{since:15,level:1}},{id:'reading',skill:80,trainedAt:-1,progress:{since:10,level:1}}];return l;}
const details=(l:ReturnType<typeof fixture>)=>renderToStaticMarkup(React.createElement(LifeDetails,{life:l,t:translator('en')}));
const actions=(l:ReturnType<typeof fixture>)=>renderToStaticMarkup(React.createElement(LifeActions,{life:l,t:translator('en'),onChange:()=>{}}));
test('observed hobbies display actual practice level and start age instead of a disconnected legacy meter',()=>{
 const l=fixture(),html=details(l);assert.match(html,/Level 2\.4/);assert.match(html,/since age 7/);assert.doesNotMatch(html,/Art.*99/);
 const controls=actions(l);assert.match(controls,/Equipment and lessons/);assert.match(controls,/Look for a new hobby/);assert.match(controls,/replaces Reading/);assert.doesNotMatch(controls,/<meter/);
});
test('unknown old hobby levels retain their existing meter and do not invent a start age',()=>{
 const l=fixture();delete l.academics;for(const h of l.hobbies)delete h.progress;
 const html=actions(l);assert.match(html,/<meter/);assert.doesNotMatch(html,/since age|replaces Reading|Equipment and lessons/);
});

test('no-progress hobbies in a birth-origin save keep usable legacy practice controls',()=>{
 const l=fixture();for(const h of l.hobbies)delete h.progress;
 const html=actions(l);assert.match(html,/<meter/);assert.match(html,/Practice/);assert.doesNotMatch(html,/Equipment and lessons|since age/);
});
