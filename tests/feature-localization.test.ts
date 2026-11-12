import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {catalogs,EN,LOCALES,translator} from '../src/lib/i18n';
import expansion from '../src/lib/catalogs/expansion-en.json';
import pending from '../src/lib/english-first-keys.json';
import {FURNITURE,ROOM_OPTIONS,normalizeRoom} from '../src/lib/room-data';
import {FILM_MOODS,MUSIC_TRACKS,normalizeFilmSettings} from '../src/lib/film-model';
import {createLife,DEFAULT_SETTINGS} from '../src/game/engine';
import {decodeSave,encodeSave} from '../src/game/storage';
import {epilogueStory} from '../src/lib/ending-story';
import {albumDocument,shareText,drawFilmFrame,drawLifeCard} from '../src/lib/life-media';

test('feature catalogs have explicit values and exact interpolation parity in all ten locales',()=>{
 assert.ok(pending.every(key=>Object.hasOwn(EN,key)));
 const placeholders=(s:string)=>[...s.matchAll(/\{(\w+)\}/g)].map(m=>m[1]).sort();
 for(const {code} of LOCALES)for(const key of Object.keys(expansion)){
  assert.ok(Object.hasOwn(catalogs[code],key),`${code}.${key} must not fall back`);
  assert.ok(catalogs[code][key].trim());
  assert.deepEqual(placeholders(catalogs[code][key]),placeholders(EN[key]),`${code}.${key}`);
 }
});

test('persisted health event keys translate while saved IDs, names and authored notes remain unchanged',()=>{
 const life=createLife(DEFAULT_SETTINGS,222);
 life.events.push({...life.events[0],id:'health-localization',kind:'health',key:'event.healthTreatment',params:{name:'<Maya>',amount:'$140'}});
 const save=encodeSave(life,[]),restored=decodeSave(save).life!;
 for(const {code} of LOCALES){
  const t=translator(code),event=restored.events.find(e=>e.id==='health-localization')!,text=t(event.key,event.params);
  assert.ok(text.includes('<Maya>'));assert.ok(text.includes('$140'));assert.ok(!text.includes('event.healthTreatment'));
  if(code!=='en')assert.notEqual(text,translator('en')(event.key,event.params));
  assert.equal(encodeSave(restored,[]),save);
 }
 assert.equal(restored.events.find(e=>e.id==='health-localization')!.params.name,'<Maya>');
});

test('dynamic room and media option labels resolve without changing persisted option IDs',()=>{
 const life=createLife(DEFAULT_SETTINGS,223),room=normalizeRoom({music:'musicBox',clothes:'navy',items:Array(8).fill('recordPlayer'),title:'User title',words:'User words'});
 const film=normalizeFilmSettings({music:'rain',mood:'midnight',title:'My film',captions:{[life.events[0].id]:'My caption'}},life);
 const snapshot=JSON.stringify({room,film});
 for(const {code} of LOCALES){const t=translator(code);
  for(const value of [...FURNITURE,...Object.keys(ROOM_OPTIONS),...Object.values(ROOM_OPTIONS).flat()]){
   const featureKey=`feature.room.${value}`,key=Object.hasOwn(EN,featureKey)?featureKey:`ui.${value}`;
   assert.ok(catalogs[code][key],`${code} room option ${value}`);assert.notEqual(t(key),key);
  }
  for(const mood of FILM_MOODS)assert.notEqual(t(`feature.mood.${mood}`),`feature.mood.${mood}`);
  for(const track of MUSIC_TRACKS)assert.notEqual(t(`feature.track.${track}`),`feature.track.${track}`);
 }
 assert.equal(JSON.stringify({room,film}),snapshot);
});

test('epilogue, album, share and canvas headings follow locale while user words remain exact and private text stays excluded',()=>{
 const life=createLife(DEFAULT_SETTINGS,224);life.name='Maya <&>';life.reflections['0']='NEVER-PUBLISH-PRIVATE';
 const settings=normalizeFilmSettings({title:'User <title>',words:'User <closing>',captions:{[life.events[0].id]:'User <caption>'}},life);
 const save=JSON.stringify(life);
 for(const {code} of LOCALES){const t=translator(code);
  for(const age of [1,12,40]){const sample={...life,age},story=epilogueStory(sample,t);assert.equal(story.lines.length,3);assert.ok(story.lines[0].includes(life.name));if(code!=='en')assert.notEqual(story.title,epilogueStory(sample).title);}
  for(const hobby of ['reading','music','nature'] as const){const story=epilogueStory({...life,age:40,hobbies:[{id:hobby,skill:10}]},t);assert.ok(!story.lines.join(' ').includes('NEVER-PUBLISH-PRIVATE'));}
  const html=albumDocument(life,code,t,settings),share=shareText(life,code,t,'User comment');
  assert.ok(html.includes('User &lt;title&gt;'));assert.ok(html.includes('User &lt;closing&gt;'));assert.ok(html.includes(t('feature.lifeAlbum')));
  assert.ok(share.startsWith('User comment'));assert.ok(share.includes(t('feature.birthShare',{year:life.birthYear})));
  assert.ok(!html.includes('NEVER-PUBLISH-PRIVATE'));assert.ok(!share.includes('NEVER-PUBLISH-PRIVATE'));
  const drawn:string[]=[];
  const ctx=new Proxy({measureText:(text:string)=>({width:text.length*3}),fillText:(text:string)=>drawn.push(text)},{get:(target,key)=>key in target?target[key as keyof typeof target]:()=>{},set:()=>true});
  const canvas={width:1080,height:1350,getContext:()=>ctx} as unknown as HTMLCanvasElement;
  drawLifeCard(canvas,life,code,t);assert.ok(drawn.includes(t('birthRegistration')));assert.ok(drawn.includes(`1in8bn.com · ${t('feature.lifeAmong')}`));
  drawFilmFrame(canvas,life,t,settings,'epilogue',10);assert.ok(drawn.includes(`1in8bn · ${t('feature.oneLife')}`));
 }
 assert.equal(JSON.stringify(life),save);
});

test('scoped feature UI has no hardcoded prose in JSX text or accessibility attributes',()=>{
 // Proper names, the site address and the visual brand wordmark are intentional.
 const allowed=new Set(['WhatsApp','WhatsApp ↗','in 8','1in8bn.com ·','1in8bn','1in8bn.com','support@1in8bn.com','1','bn','Billion','in 8 Billion','Born Somewhere · MIT']);
 const files=['Healthcare','ShareLife','FilmStudio','LastMoments','LifeTimeline','MemoryRoom','RoomMusic','GameApp'];
 const leftovers:string[]=[];
 for(const file of files){
  const source=ts.createSourceFile(file,readFileSync(new URL(`../src/components/${file}.tsx`,import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const visit=(node:ts.Node)=>{
   if(ts.isJsxText(node)){const text=node.text.replaceAll("&lt;","<").trim();if(/[A-Za-z]{2,}/.test(text)&&!allowed.has(text))leftovers.push(`${file}: ${text}`);}
   if(ts.isJsxAttribute(node)&&['aria-label','placeholder','alt','title'].includes(node.name.getText(source))&&node.initializer&&ts.isStringLiteral(node.initializer)&&/[A-Za-z]/.test(node.initializer.text))leftovers.push(`${file} attribute: ${node.initializer.text}`);
   ts.forEachChild(node,visit);
  };visit(source);
 }
 assert.deepEqual(leftovers,[]);
});


test('public country labels translate known codes and English names without rewriting legacy or user text',async()=>{
 const {publicCountryName,countryName,getCountries}=await import('../src/game/countries');
 const japan=getCountries().find(c=>c.id==='JPN')!;
 for(const {code} of LOCALES){assert.equal(publicCountryName('Japan',code),countryName(japan,code));assert.equal(publicCountryName('JPN',code),countryName(japan,code));assert.equal(publicCountryName('Unknown place <&>',code),'Unknown place <&>');}
});
