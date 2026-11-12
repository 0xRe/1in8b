import test from 'node:test';
import assert from 'node:assert/strict';
import { createDuoVoiceSession } from '../src/lib/duo-voice';

function fixture() {
  const calls:string[]=[]; const handlers:Record<string,Function>={};
  const track={stop(){calls.push('stop');},close(){calls.push('close');},async setMuted(v:boolean){calls.push(`mute:${v}`);}};
  const client={on(e:string,fn:Function){handlers[e]=fn;},removeAllListeners(){},async join(...v:unknown[]){calls.push(`join:${v[1]}:${v[3]}`);},async publish(){calls.push('publish');},async leave(){calls.push('leave');},async subscribe(){calls.push('subscribe');},async renewToken(){calls.push('renew');}};
  const sdk={createClient:()=>client,async createMicrophoneAudioTrack(){return track;},async resumeAudioContext(){}};
  let tokenCalls=0;
  const load=async()=>{tokenCalls++;return {appId:'test',token:'secret',channel:'authorized-room',uid:1,peerUid:2,expiresAt:Date.now()+900000};};
  return {calls,handlers,sdk,load,get tokenCalls(){return tokenCalls;}};
}
test('duo voice joins authorized identity, publishes and releases microphone before leaving',async()=>{
 const f=fixture(),s=createDuoVoiceSession(f.sdk as never,f.load,()=>{});
 await s.start();assert.deepEqual(f.calls.slice(0,2),['join:authorized-room:1','publish']);
 await s.mute(true);await s.stop();assert.deepEqual(f.calls.slice(-3),['stop','close','leave']);
});
test('only authorized peer audio is subscribed and token renewal is deduplicated',async()=>{
 const f=fixture(),s=createDuoVoiceSession(f.sdk as never,f.load,()=>{});await s.start();
 await f.handlers['user-published']({uid:99},'audio');assert.ok(!f.calls.includes('subscribe'));
 await f.handlers['user-published']({uid:2,audioTrack:{play(){f.calls.push('play');}}},'audio');assert.ok(f.calls.includes('play'));
 await Promise.all([f.handlers['token-privilege-will-expire'](),f.handlers['token-privilege-will-expire']()]);
 assert.equal(f.tokenCalls,2);await s.stop();
});
test('failed microphone setup leaves the channel and reports failure',async()=>{
 const f=fixture();f.sdk.createMicrophoneAudioTrack=async()=>{throw Error('denied');};
 const states:string[]=[];const s=createDuoVoiceSession(f.sdk as never,f.load,x=>states.push(x));
 await assert.rejects(s.start());assert.ok(f.calls.includes('leave'));assert.equal(states.at(-1),'error');
});

test('closing during microphone acquisition releases late microphone without publishing',async()=>{
 const f=fixture();let release!:(t:unknown)=>void;const acquired=new Promise<any>(r=>release=r);
 f.sdk.createMicrophoneAudioTrack=()=>acquired;const s=createDuoVoiceSession(f.sdk as never,f.load,()=>{});
 const starting=s.start();await new Promise(r=>setTimeout(r,0));await s.stop();
 release({stop(){f.calls.push('late-stop');},close(){f.calls.push('late-close');}});await starting;
 assert.ok(!f.calls.includes('publish'));assert.ok(f.calls.includes('late-close'));
});

test('failed peer audio subscription stops publishing before reporting an error',async()=>{
 const f=fixture(),states:string[]=[];
 f.sdk.createClient().subscribe=async()=>{throw Error('network interrupted');};
 const s=createDuoVoiceSession(f.sdk as never,f.load,x=>states.push(x));await s.start();
 await f.handlers['user-published']({uid:2},'audio');
 assert.deepEqual(f.calls.slice(-3),['stop','close','leave']);assert.equal(states.at(-1),'error');
});

test('leave failure still releases the microphone and completes local shutdown',async()=>{
 const f=fixture(),states:string[]=[];
 f.sdk.createClient().leave=async()=>{f.calls.push('leave');throw Error('transport unavailable');};
 const s=createDuoVoiceSession(f.sdk as never,f.load,x=>states.push(x));await s.start();
 await assert.doesNotReject(s.stop());
 assert.deepEqual(f.calls.slice(-3),['stop','close','leave']);assert.equal(states.at(-1),'off');
});

test('failed token renewal releases the microphone and reports an error',async()=>{
 const f=fixture(),states:string[]=[];
 f.sdk.createClient().renewToken=async()=>{throw Error('expired membership');};
 const s=createDuoVoiceSession(f.sdk as never,f.load,x=>states.push(x));await s.start();
 await f.handlers['token-privilege-will-expire']();
 assert.deepEqual(f.calls.slice(-3),['stop','close','leave']);assert.equal(states.at(-1),'error');
});

test('a failing local stop cannot prevent closing the device and leaving',async()=>{
 const f=fixture(),states:string[]=[];
 const track=await f.sdk.createMicrophoneAudioTrack();track.stop=()=>{f.calls.push('stop');throw Error('track already stopped');};
 const s=createDuoVoiceSession(f.sdk as never,f.load,x=>states.push(x));await s.start();
 await assert.doesNotReject(s.stop());
 assert.deepEqual(f.calls.slice(-3),['stop','close','leave']);assert.equal(states.at(-1),'off');
});

test('a peer already publishing at join is subscribed once even when the SDK also emits publish',async()=>{
 const f=fixture(),client=f.sdk.createClient();
 const peer={uid:2,hasAudio:true,audioTrack:{play(){f.calls.push('play');}}};
 Object.assign(client,{remoteUsers:[peer,{uid:99,hasAudio:true}]});
 client.join=async()=>{await f.handlers['user-published'](peer,'audio');};
 const s=createDuoVoiceSession(f.sdk as never,f.load,()=>{});await s.start();
 assert.equal(f.calls.filter(x=>x==='subscribe').length,1);assert.equal(f.calls.filter(x=>x==='play').length,1);await s.stop();
});

test('runtime disconnect and expiry report one diagnostic and permit retry without stale callback effects',async()=>{
 const f=fixture(),states:string[]=[],failures:unknown[]=[];
 const s=createDuoVoiceSession(f.sdk as never,f.load,x=>states.push(x),()=>{},x=>failures.push(x));await s.start();
 const oldExpiry=f.handlers['token-privilege-did-expire'],oldDisconnect=f.handlers['connection-state-change'];
 await oldExpiry();await oldDisconnect('DISCONNECTED','CONNECTED');
 assert.deepEqual(failures,[{reason:'token_expired',stage:'renewal'}]);assert.equal(states.at(-1),'error');
 await s.start();await oldExpiry();await oldDisconnect('DISCONNECTED','CONNECTED');
 assert.equal(states.at(-1),'connected');assert.equal(failures.length,1);
 await f.handlers['connection-state-change']('DISCONNECTED','CONNECTED');await new Promise(r=>setTimeout(r,0));
 assert.deepEqual(failures.at(-1),{reason:'connection_ended',stage:'connection'});await s.stop();
});

test('createClient failure reports sdk setup stage and leaves controller retryable',async()=>{
 const f=fixture(),failures:unknown[]=[];const create=f.sdk.createClient;
 f.sdk.createClient=()=>{throw Error('private sdk details');};
 const s=createDuoVoiceSession(f.sdk as never,f.load,()=>{},()=>{},x=>failures.push(x));
 await assert.rejects(s.start());assert.deepEqual(failures,[{reason:'sdk_load',stage:'sdk_load'}]);
 f.sdk.createClient=create;await s.start();assert.ok(f.calls.includes('publish'));await s.stop();
});

test('an old pending renewal cannot update or suppress renewal in a new session',async()=>{
 const f=fixture();let resolveOld!:(value:Awaited<ReturnType<typeof f.load>>)=>void,calls=0;
 const loader=()=>++calls===2?new Promise<Awaited<ReturnType<typeof f.load>>>(resolve=>resolveOld=resolve):f.load();
 const failures:unknown[]=[],s=createDuoVoiceSession(f.sdk as never,loader,()=>{},()=>{},x=>failures.push(x));await s.start();
 const pending=f.handlers['token-privilege-will-expire']();await s.stop();await s.start();
 await f.handlers['token-privilege-will-expire']();assert.equal(f.calls.filter(x=>x==='renew').length,1);
 resolveOld(await f.load());await pending;assert.equal(f.calls.filter(x=>x==='renew').length,1);assert.deepEqual(failures,[]);await s.stop();
});

test('failed playback and renewal are reported with separate fixed stages',async()=>{
 for(const stage of ['playback','renewal']){
  const f=fixture(),failures:unknown[]=[];
  const s=createDuoVoiceSession(f.sdk as never,f.load,()=>{},()=>{},x=>failures.push(x));await s.start();
  if(stage==='playback')await f.handlers['user-published']({uid:2,audioTrack:{play(){throw Error('sensitive playback details');}}},'audio');
  else{f.sdk.createClient().renewToken=async()=>{throw Error('private token');};await f.handlers['token-privilege-will-expire']();}
  assert.deepEqual(failures,[{reason:stage,stage}]);assert.deepEqual(f.calls.slice(-3),['stop','close','leave']);await s.stop();
 }
});
