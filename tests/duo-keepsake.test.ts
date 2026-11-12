import test from 'node:test';
import assert from 'node:assert/strict';
import { duoShareModel, duoSharePayload, sharePreparedDuoCard, DUO_PUBLIC_URL } from '../src/lib/duo-keepsake';

const snapshot={roomId:'private-room',stage:2,age:30,runIndex:0,phase:'complete',self:{id:'private-member',name:'Ari',origin:{countryName:'Japan'},life:{money:14500,job:'Growing professional',wellbeing:70}},partner:{name:'PRIVATE_FRIEND',life:{money:987654}},messages:[{text:'PRIVATE_MESSAGE'}],credential:'PRIVATE_TOKEN',history:[{age:20,choice:'study',residence:'apart',support:'independent',summary:'private source details'}]} as never;
test('share card selects only the actor story, never partner identifiers, messages or membership',()=>{
 const model=duoShareModel(snapshot),json=JSON.stringify(model);
 for(const privateValue of ['PRIVATE_FRIEND','PRIVATE_MESSAGE','PRIVATE_TOKEN','private-room','private-member','987654','private source details'])assert.ok(!json.includes(privateValue));
 assert.equal(model.name,'Ari');assert.equal(model.origin,'Japan');assert.equal(model.chapters[0].heading,'I made time to learn');
 const payload=duoSharePayload(model);
 assert.equal(payload.url,DUO_PUBLIC_URL);assert.ok(!payload.url.includes('room'));assert.ok(payload.text.includes('1in8bn.com'));
});
test('an already prepared card opens native share synchronously within the tap',async()=>{
 const model=duoShareModel(snapshot),file=new File(['png'],'story.png',{type:'image/png'});let called=false;
 const result=sharePreparedDuoCard({...duoSharePayload(model),file},{canShare:()=>true,share:async data=>{called=true;assert.equal(data.files?.[0],file);assert.equal(data.url,DUO_PUBLIC_URL);assert.ok(!data.text?.includes(DUO_PUBLIC_URL),'native composer receives its URL exactly once');}});
 assert.equal(called,true);assert.equal(await result,'shared');
});
test('native cancellation does not copy or claim success and unsupported files are explicit',async()=>{
 const payload={...duoSharePayload(duoShareModel(snapshot)),file:new File(['png'],'story.png',{type:'image/png'})};
 assert.equal(await sharePreparedDuoCard(payload,{canShare:()=>true,share:async()=>{throw new DOMException('cancelled','AbortError');}}),'cancelled');
 assert.equal(await sharePreparedDuoCard(payload,{canShare:()=>false,share:async()=>{throw Error('should not run');}}),'unsupported');
 assert.equal(await sharePreparedDuoCard(payload,{canShare:()=>true,share:async()=>{throw Error('blocked');}}),'failed');
});

test('full-life share uses actual age and never fictional credits or a partner private history', async()=>{
 const {createNewGame}=await import('../src/game/new-game');
 const {DEFAULT_SETTINGS}=await import('../src/game/engine');
 const life=createNewGame({...DEFAULT_SETTINGS,gentler:true},12345);
 life.age=81;life.year=life.birthYear+81;life.alive=false;life.stats.netAssets=3200;
 const full={...(snapshot as object),lifetime:{self:{life},memories:[{year:2044,title:'PRIVATE SHARED TITLE',summary:'PRIVATE SHARED DETAILS'}]}} as never;
 const model=duoShareModel(full);assert.equal(model.age,81);assert.equal(model.money,3200);assert.equal(model.fullLife,true);
 const text=duoSharePayload(model).text;assert.match(text,/independent lives from birth/);assert.doesNotMatch(text,/three|PRIVATE|credits/);assert.equal(model.chapters[1].age,81);
});
