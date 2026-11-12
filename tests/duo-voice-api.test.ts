import test from 'node:test';
import assert from 'node:assert/strict';
import type {DuoVoiceEnv} from '../src/lib/duo-voice-api';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{buildSync}=require(require.resolve('esbuild',{paths:[require.resolve('wrangler')]}));
// Exercise the same bundled CJS interop used by Vite for agora-token's CommonJS exports.
const source=buildSync({stdin:{contents:"export {duoVoice} from './src/lib/duo-voice-api';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',packages:'external'}).outputFiles[0].text;
const loaded={exports:{} as {duoVoice:typeof import('../src/lib/duo-voice-api').duoVoice}};
new Function('require','module','exports',source)(require,loaded,loaded.exports);
const {duoVoice}=loaded.exports;
const origin='https://1in8bn.com',roomId='acb423cd-bc45-43cc-b225-369dfdb51ee2',credential='c'.repeat(64);
const request=(headers:Record<string,string>={})=>new Request(`${origin}/api/duo/rooms/${roomId}/voice`,{method:'POST',headers:{Origin:origin,Authorization:`Bearer ${credential}`,...headers}});
function env(handler:(request:Request)=>Response|Promise<Response>):DuoVoiceEnv{return {DUO_ROOMS:{getByName(name:string){assert.equal(name,roomId);return {fetch:handler};}} as unknown as DurableObjectNamespace};}
test('real voice route preserves validated membership statuses without leaking membership messages',async()=>{
 for(const status of [400,401,403,409,410,429,503]){
  const response=await duoVoice(request(),env(req=>{assert.equal(new URL(req.url).pathname,'/membership');return Response.json({error:`PRIVATE ${roomId} ${credential}`},{status});}),roomId);
  assert.equal(response.status,status);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(response.headers.get('X-Content-Type-Options'),'nosniff');
  const body=await response.text();assert.doesNotMatch(body,/PRIVATE|acb423cd|cccccccc/);
  if(status===409)assert.match(body,/friend must join/);if(status===410)assert.match(body,/room has ended/);
 }
});
test('unexpected membership transport failures return safe500 rather than misleading403',async()=>{
 const response=await duoVoice(request(),env(()=>{throw Error(`PRIVATE ${roomId} ${credential}`);}),roomId);
 assert.equal(response.status,500);assert.deepEqual(await response.json(),{error:'Voice is temporarily unavailable. Text play is available.'});
});
test('origin and absent membership reject correctly before voice configuration or token generation',async()=>{
 let calls=0;const environment=env(()=>{calls++;return Response.json({});});
 assert.equal((await duoVoice(request({Origin:'https://other.test'}),environment,roomId)).status,403);
 assert.equal((await duoVoice(request({Authorization:''}),environment,roomId)).status,401);assert.equal(calls,0);
});
