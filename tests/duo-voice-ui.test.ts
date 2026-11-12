import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import * as React from 'react';
const require=createRequire(import.meta.url),{buildSync}=require(require.resolve('esbuild',{paths:[require.resolve('wrangler')]}));
const source=buildSync({stdin:{contents:"export {DuoVoice} from './src/components/DuoVoice';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',packages:'external',external:['../lib/duo-voice'],alias:{'agora-rtc-sdk-ng':'./tests/fixtures/voice-sdk-stub.ts'}}).outputFiles[0].text;
function nodes(tree:any):any[]{return !tree||typeof tree!=='object'?[]:Array.isArray(tree)?tree.flatMap(nodes):[tree,...nodes(tree.props?.children)];}
function text(tree:any):string{return typeof tree==='string'?tree:Array.isArray(tree)?tree.map(text).join(''):tree&&typeof tree==='object'?text(tree.props?.children):'';}
function harness(){
 let at=0;const slots:any[]=[],sessions:any[]=[];
 const hooks={...React,useState:(initial:any)=>{const i=at++;if(!(i in slots))slots[i]=initial;return[slots[i],(v:any)=>slots[i]=v];},useRef:(initial:any)=>{const i=at++;return slots[i]??(slots[i]={current:initial});},useEffect:()=>{}};
 const controller={createDuoVoiceSession(_sdk:any,_ticket:any,state:any,_peer:any,failure:any){const s={async start(){state('connected');},async stop(){state('off');},async mute(){},fail(){failure({reason:'subscribe',stage:'subscribe'});state('error');},state,failure};sessions.push(s);return s;}};
 const loaded={exports:{} as any};new Function('require','module','exports',source)((id:string)=>id==='react'?hooks:id==='../lib/duo-voice'?controller:require(id),loaded,loaded.exports);
 const render=()=>{at=0;return loaded.exports.DuoVoice({roomId:'PRIVATE_ROOM',memberToken:'PRIVATE_TOKEN'});};
 const click=async(label:string)=>{const button=nodes(render()).find(n=>n.type==='button'&&text(n)===label);assert.ok(button,label);button.props.onClick();await new Promise(r=>setTimeout(r,0));};
 return{render,sessions,click};
}
test('real voice UI reports runtime failure once and retries without stale callbacks',async()=>{
 const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'window',{configurable:true,value:{isSecureContext:true,RTCPeerConnection:function(){}}});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true,mediaDevices:{getUserMedia(){}}}});
 try{
  const h=harness();await h.click('Enable voice');assert.equal(h.sessions.length,1);
  h.sessions[0].fail();h.sessions[0].fail();
  assert.match(text(h.render()),/Retry voice/);assert.match(text(h.render()),/connection ended/);
  await h.click('Retry voice');assert.equal(h.sessions.length,2);
  h.sessions[0].fail();assert.match(text(h.render()),/Leave voice/);
 }finally{if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else Reflect.deleteProperty(globalThis,'window');if(oldNavigator)Object.defineProperty(globalThis,'navigator',oldNavigator);else Reflect.deleteProperty(globalThis,'navigator');}
});
