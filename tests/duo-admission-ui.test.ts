import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as React from 'react';
import * as lifecycle from '../src/lib/duo-client-lifecycle';
import { createFullDuoState, duoSnapshot } from '../src/lib/duo-engine';
const require=createRequire(import.meta.url), {build}=require(require.resolve('esbuild',{paths:[require.resolve('wrangler')]}));
// Bundle the real component while replacing only the poll scheduler.
const source=(await build({stdin:{contents:"export {DuoGame} from './src/components/DuoGame';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',packages:'external',loader:{'.css':'empty'},define:{'import.meta.env.PROD':'false'},plugins:[{name:'admission-test-imports',setup(builder:any){builder.onResolve({filter:/duo-client-lifecycle$/},()=>({path:'duo-test-lifecycle',external:true}));}}]})).outputFiles[0].text;
function nodes(tree:any):any[]{return !tree||typeof tree!=='object'?[]:Array.isArray(tree)?tree.flatMap(nodes):[tree,...nodes(tree.props?.children)];}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function harness(join=false, options:{fragment?:string|null;tab?:string;local?:string;blocked?:boolean;accepted?:string;incomplete?:boolean}={}) {
  let at=0;const slots:any[]=[],effects:(()=>unknown)[]=[];
  let polling:any;
  const hooks={...React,useState:(initial:any)=>{const i=at++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],(v:any)=>slots[i]=typeof v==='function'?v(slots[i]):v];},useRef:(initial:any)=>{const i=at++;return slots[i]??(slots[i]={current:initial});},useEffect:(effect:()=>unknown)=>{effects.push(effect);},useCallback:(callback:any)=>callback};
  const storage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
  const session={...storage,getItem:(key:string)=>key.startsWith('1in8bn-duo-tab-member:')?options.tab??null:key.startsWith('1in8bn-duo-accepted-invite:')?options.accepted??null:key.startsWith('1in8bn-duo-incomplete-link:')&&options.incomplete?'1':null};
  const local={...storage,getItem:(key:string)=>key.startsWith('1in8bn-duo-member:')?options.local??null:null};
  const win={location:{href:`https://1in8bn.com/together/${join?`?room=PRIVATE_ROOM${options.fragment===null?'':`#invite=${options.fragment??'a'.repeat(64)}`}`:''}`},history:{replaceState:()=>{}},localStorage:local,sessionStorage:session,addEventListener:()=>{},removeEventListener:()=>{}};
  if(options.blocked)for(const key of ['localStorage','sessionStorage'])Object.defineProperty(win,key,{get(){throw new DOMException('blocked','SecurityError');}});
  const loaded={exports:{} as any};
  new Function('require','module','exports','window','document',source)((id:string)=>id==='react'?hooks:id==='duo-test-lifecycle'?{...lifecycle,startDuoPolling:(options:any)=>{polling=options;return {wake:()=>{},stop:()=>{}};}}:require(id),loaded,loaded.exports,win,{visibilityState:'visible',addEventListener:()=>{},removeEventListener:()=>{}});
  function render(){at=0;effects.length=0;return loaded.exports.DuoGame();}
  render(); effects[0]();
  let tree=render(); nodes(tree).find(n=>n.type==='input'&&n.props.id==='duo-name')?.props.onChange({target:{value:'PRIVATE_NAME'}});
  tree=render();
  return {render,submit:async()=>{const form=nodes(render()).find(n=>n.type==='form');form.props.onSubmit({preventDefault:()=>{}});await flush();},effects:()=>[...effects],get polling(){return polling;}};
}
test('real admission and command failures show safe errors and recover polling',async()=>{
  const oldFetch=globalThis.fetch;
  try {
    for(const join of [false,true]) {
      globalThis.fetch=async()=>Response.json({error:'PRIVATE_RAW ?room=PRIVATE_ROOM #invite=PRIVATE_INVITE',reason:join?'invitation_used':undefined},{status:join?403:503});
      const h=harness(join); await h.submit();
      assert.ok(!JSON.stringify(h.render()).includes('PRIVATE_RAW'));
    }
    const h=harness();
    const state=createFullDuoState('PRIVATE_ROOM','PRIVATE_NAME','PRIVATE_ACTOR','PRIVATE_HASH','PRIVATE_INVITE',Date.now());
    globalThis.fetch=async()=>Response.json({credential:'PRIVATE_CREDENTIAL',inviteSecret:'PRIVATE_INVITE',snapshot:duoSnapshot(state,'PRIVATE_ACTOR',Date.now())});
    await h.submit();
    let lifetime=nodes(h.render()).find(n=>typeof n.type==='function'&&n.type.name==='DuoLifetime'); assert.ok(lifetime);
    globalThis.fetch=async()=>Response.json({error:'PRIVATE_RAW ?room=PRIVATE_ROOM'},{status:409});
    assert.equal(await lifetime.props.command({kind:'shared-approve',eventId:'PRIVATE_EVENT',proposalVersion:0}),false);
    h.render(); for(const effect of h.effects()) effect(); assert.ok(h.polling);
    for(let i=0;i<4;i++) h.polling.failure(new TypeError('PRIVATE_NETWORK_URL'));
    globalThis.fetch=async()=>new Response(null,{status:304});
    await h.polling.request(new AbortController().signal);
    lifetime=nodes(h.render()).find(n=>typeof n.type==='function'&&n.type.name==='DuoLifetime');
    assert.equal(lifetime.props.error,'','poll recovery clears its own connection message');
    h.polling.failure(new lifecycle.DuoApiError(503,'Safe poll failure'));
    globalThis.fetch=async()=>new Response(null,{status:304}); await h.polling.request(new AbortController().signal);
    lifetime=nodes(h.render()).find(n=>typeof n.type==='function'&&n.type.name==='DuoLifetime');
    assert.equal(lifetime.props.error,'','typed poll failures clear on recovery too');
  } finally {globalThis.fetch=oldFetch;}
});

test('real entry rejects malformed invitation without preview/join and recovers only its same-tab seat',async()=>{
 const old=globalThis.fetch;let requests=0;globalThis.fetch=async()=>{requests++;return Response.json({});};
 try{
  const bad=harness(true,{fragment:'null',local:'HOST_PRIVATE_KEY'});for(const effect of bad.effects())effect();await flush();
  assert.equal(requests,0);const form=nodes(bad.render()).find(n=>n.type==='form');assert.ok(form);assert.ok(nodes(bad.render()).some(n=>typeof n.props?.children==='string'&&n.props.children.includes('complete invitation link')));
  const own=harness(true,{fragment:'null',tab:'OWN_PRIVATE_KEY',local:'HOST_PRIVATE_KEY'});const loading=nodes(own.render()).filter(n=>typeof n.props?.children==='string').map(n=>n.props.children).join(' ');assert.match(loading,/being reconnected/);
 }finally{globalThis.fetch=old;}
});

test('storage property denial renders usable entry and blocks unsafe admission before network writes',async()=>{
 const old=globalThis.fetch;let requests=0;globalThis.fetch=async()=>{requests++;return Response.json({});};
 try{const h=harness(true,{blocked:true});await h.submit();assert.equal(requests,0);assert.ok(nodes(h.render()).some(n=>typeof n.props?.children==='string'&&n.props.children.includes('blocked session storage')));}finally{globalThis.fetch=old;}
});

test('the real component restores an accepted link only with matching tab proof, retaining fresh-invite isolation',()=>{
 const secret='b'.repeat(64),credential='c'.repeat(64);
 const recovered=harness(true,{fragment:secret,tab:credential,accepted:secret});assert.ok(nodes(recovered.render()).some(n=>n.props?.children==='Your character is being reconnected to the room.'));
 const guest=harness(true,{fragment:secret,local:credential});assert.ok(nodes(guest.render()).some(n=>n.type==='button'&&nodes(n.props.children).length>=0&&JSON.stringify(n.props.children).includes('Join this room')));
 const older=harness(true,{fragment:secret,tab:credential});const recover=nodes(older.render()).find(n=>n.type==='button'&&n.props.children==='Return to this tab’s saved character');assert.ok(recover);recover.props.onClick();assert.ok(nodes(older.render()).some(n=>n.props?.children==='Your character is being reconnected to the room.'));
});

test('actual reload of an incomplete link does not adopt a shared host credential',()=>{
 const h=harness(true,{fragment:null,incomplete:true,local:'c'.repeat(64)});assert.ok(nodes(h.render()).some(n=>n.type==='form'));assert.ok(!nodes(h.render()).some(n=>n.props?.children==='Your character is being reconnected to the room.'));
});
