import {translator} from '../src/lib/i18n';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createBirthTicket, previewCountry, BIRTH_PREVIEW_TIMES } from '../src/lib/birth-journey';
import { createLife, DEFAULT_SETTINGS } from '../src/game/engine';
import { birthCardFacts, drawBirthShareCard } from '../src/lib/birth-card';
import { birthInvitationUrl, readBirthInvitation, shareIntents, shareImageAction } from '../src/lib/social-sharing';

test('birth tickets defer real selection and resolve exactly once for repeated completion or skip',()=>{
 let count=0;const ticket=createBirthTicket(()=>({id:++count}));assert.equal(count,0);
 const first=ticket.select();assert.deepEqual(first,{id:1});assert.equal(ticket.select(),first);assert.equal(count,1);
});
test('weighted preview handles bounds without mutating or consuming a life RNG',()=>{
 assert.equal(previewCountry('births',0).id,'AFG');assert.equal(previewCountry('births',.999999).id,'CPV');
 assert.ok(previewCountry('population',.5).id);assert.ok(previewCountry('equal',.5).id);
 assert.ok(BIRTH_PREVIEW_TIMES.at(-1)!>=3000);const gaps=BIRTH_PREVIEW_TIMES.slice(1).map((n,i)=>n-BIRTH_PREVIEW_TIMES[i]);assert.ok(gaps.at(-1)!>gaps[0]);
 const life=createLife(DEFAULT_SETTINGS,4);const before=JSON.stringify(life);for(let i=0;i<50;i++)previewCountry('births',i/50);assert.equal(JSON.stringify(life),before);
});
test('birth card uses birthplace rates in correct units and exposes no reflections',()=>{
 const life=createLife({...DEFAULT_SETTINGS,country:'IND'},4);life.reflections['0']='private secret';const before=JSON.stringify(life);
 const facts=birthCardFacts(life,'en');assert.equal(facts.country.id,'IND');assert.equal(facts.underFivePercent,life.country.u5/10);assert.ok(facts.birthPercent>0&&facts.birthPercent<100);assert.ok(facts.expectancy>0);assert.ok(!JSON.stringify(facts).includes('private secret'));assert.equal(JSON.stringify(life),before);
});
test('invitation links carry country only, preserve clean locale paths and reject unknown input',()=>{
 assert.equal(birthInvitationUrl('en','IND'),'https://1in8bn.com/?born=IND');assert.equal(birthInvitationUrl('ja','JPN'),'https://1in8bn.com/ja/?born=JPN');
 assert.equal(birthInvitationUrl('en','<script>'),'https://1in8bn.com/');assert.equal(readBirthInvitation('?born=IND&name=secret')?.id,'IND');
 assert.equal(readBirthInvitation('?born=https://evil.example'),null);assert.equal(readBirthInvitation('?born=ind'),null);
 const intents=shareIntents('Words & a link','https://1in8bn.com/?born=IND');const x=new URL(intents.x);assert.equal(x.origin,'https://x.com');assert.equal(x.searchParams.get('text'),'Words & a link');assert.equal(x.searchParams.get('url'),'https://1in8bn.com/?born=IND');
 assert.equal(new URL(intents.threads).searchParams.get('text'),'Words & a link\nhttps://1in8bn.com/?born=IND');
});
test('image sharing uses a real file payload and reports unsupported/cancelled/error separately',async()=>{
 const file=new File(['png'],'birth.png',{type:'image/png'});let payload:any;
 assert.equal(await shareImageAction({canShare:()=>true,share:async p=>{payload=p;}},file,{title:'Birth',text:'Hello',url:'https://1in8bn.com/'}),'shared');assert.equal(payload.files[0],file);assert.ok(payload.text.includes('https://1in8bn.com/'));
 let called=false;assert.equal(await shareImageAction({canShare:()=>false,share:async()=>{called=true}},file,{title:'',text:'',url:''}),'unsupported');assert.equal(called,false);
 assert.equal(await shareImageAction({canShare:()=>true,share:async()=>{throw new DOMException('Cancelled','AbortError')}},file,{title:'',text:'',url:''}),'cancelled');
 assert.equal(await shareImageAction({canShare:()=>{throw Error('blocked')},share:async()=>{}},file,{title:'',text:'',url:''}),'unavailable');
});

test('both exported birth formats print the canonical domain in the image itself',()=>{
 for(const height of [1350,1920]){
  const drawn:string[]=[];
  const ctx=new Proxy({measureText:(text:string)=>({width:text.length*5}),fillText:(text:string)=>drawn.push(text)},{get:(target,key)=>key in target?target[key as keyof typeof target]:()=>{},set:(target,key,value)=>{(target as any)[key]=value;return true}});
  const canvas={width:1080,height,getContext:()=>ctx} as unknown as HTMLCanvasElement;
  drawBirthShareCard(canvas,createLife({...DEFAULT_SETTINGS,country:'IND'},4),'en',translator('en'));
  assert.ok(drawn.includes('1in8bn.com'));
 }
});
