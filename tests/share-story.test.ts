import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {advanceYear,createLife,DEFAULT_SETTINGS} from '../src/game/engine';
import type {GameEvent} from '../src/game/types';
import {isPeakMoment,storyMoments,momentPost} from '../src/lib/share-story';
import {storyCopy} from '../src/lib/share-story-copy';
import {LOCALES,translator} from '../src/lib/i18n';
import {ShareStoryPicker} from '../src/components/ShareStoryPicker';
const life=()=>{const l=createLife(DEFAULT_SETTINGS,9157);l.age=70;l.year=l.birthYear+70;return l;};
const event=(age:number,kind:GameEvent['kind'],key:string,id=key,params={}):GameEvent=>({id,age,year:2026+age,kind,key,params,icon:'star'});

test('suggested moments balance actual family, work and milestones, without private or unplayed material',()=>{
 const l=life();l.birthYear=2026;
 l.events=[event(18,'milestone','event.schoolEnd'),event(25,'family','event.marriage'),event(30,'family','event.childBorn'),...Array.from({length:8},(_,i)=>event(35+i,'career','event.job',`work${i}`,{n:i})),event(43,'career','event.job','repeat',{n:7}),event(60,'reflection','event.reflection'),event(60,'family','event.parentDeath'),event(60,'health','event.healthIcu'),event(61,'milestone','event.choice'),event(61,'milestone','event.decision'),event(71,'family','event.future')];
 const result=storyMoments(l);
 assert.ok(result.some(e=>e.key==='event.childBorn'));assert.ok(result.some(e=>e.key==='event.marriage'));
 assert.equal(result.filter(e=>e.kind==='career').length,2);assert.ok(result.some(e=>e.key==='event.schoolEnd'));
 assert.ok(result.every(e=>e.age<=70&&!/reflection|death|Icu|choice|decision|future/i.test(e.key)));
 assert.equal(new Set(result.map(e=>JSON.stringify([e.key,e.params]))).size,result.length);
 assert.deepEqual(result.map(e=>e.age),result.map(e=>e.age).sort((a,b)=>a-b));
});
test('moment caption uses the chosen event and explicitly entered words, never a private reflection',()=>{
 const l=life(),t=translator('zh-hans');l.reflections={'30':'PRIVATE JOURNAL'};const e=event(30,'family','event.marriage','marriage',{name:'Alex'});
 const text=momentPost(l,e,'zh-hans',t,'我想记住这一刻');
 assert.ok(text.startsWith('我想记住这一刻\n'));assert.ok(text.includes(t(e.key,e.params)));assert.ok(text.includes('30'));assert.ok(text.includes('2056'));
 assert.ok(!text.includes('PRIVATE JOURNAL'));assert.ok(!/只有|Only|最快樂|happiest/.test(text));
});
test('the story picker exposes recorded memories and a whole-life reset as ordinary keyboard-operable buttons',()=>{
 const l=life();l.birthYear=2026;l.events=[event(25,'family','event.marriage','wedding',{name:'Alex'})];
 const html=renderToStaticMarkup(createElement(ShareStoryPicker,{life:l,locale:'en',t:translator('en'),selected:'wedding',onSelect(){}}));
 assert.ok(html.includes('What would you share?'));assert.ok(html.includes('My whole life'));assert.ok(html.includes('Age 25'));assert.ok(html.includes('aria-pressed="true"'));assert.ok(!html.includes('<select'));assert.ok(!html.includes('<details'));
 l.events=[];assert.equal(renderToStaticMarkup(createElement(ShareStoryPicker,{life:l,locale:'en',t:translator('en'),selected:'',onSelect(){}})),'');
});
test('all supported languages have their own story-editor labels',()=>{
 for(const {code} of LOCALES){const copy=storyCopy(code);assert.ok(copy.choose&&copy.caption&&copy.optional);if(code!=='en')assert.notEqual(copy,storyCopy('en'));}
});

test('only the peaks of a life get a share button, and a chosen moment is always offered',()=>{
 const l=createLife({...DEFAULT_SETTINGS,country:'JPN',autoChoices:true},4242);
 let life=l;while(life.alive)life=advanceYear(life);
 const peaks=life.events.filter(e=>isPeakMoment(life,e));
 assert.ok(peaks.length>0&&peaks.length<=12,`peaks ${peaks.length}`);
 assert.ok(peaks.every(e=>!/promotion|descendantStories|descendantVisit/.test(e.key)));
 const oldest=peaks[0];
 assert.ok(storyMoments(life,oldest.id).some(e=>e.id===oldest.id));
 assert.equal(storyMoments(life,'not-an-event').length,storyMoments(life).length);
});
