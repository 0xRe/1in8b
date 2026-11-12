import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDuoState, createFullDuoState, joinDuo, applyDuoCommand, type DuoCommand } from "../src/lib/duo-engine";
import { duoHash } from "../src/lib/duo-api";

// Exercise the actual DO class in Workers' runtime, using Wrangler's bundled tools.
const require = createRequire(import.meta.url);
const wrangler = require.resolve("wrangler");
const { buildSync } = require(require.resolve("esbuild", { paths: [wrangler] }));
const { Miniflare, convertV4MiniflareOptions } = require(require.resolve("miniflare", { paths: [wrangler] }));
const output = buildSync({ stdin: { contents: `import { DuoRoom } from './src/duo-room'; export { DuoRoom }; export class DuoRoomFixture extends DuoRoom { async seed(state) { this.cachedState = undefined; this.snapshots.clear(); await this.ctx.storage.delete('presence'); await this.ctx.storage.put('room', state); } async countWrites() { this.writes = []; const storage = this.ctx.storage; const put = storage.put.bind(storage); storage.put = async (key, value) => { this.writes.push({key, bytes: JSON.stringify(value).length}); return put(key, value); }; const transact = storage.transaction.bind(storage); storage.transaction = closure => transact(async tx => { const txPut = tx.put.bind(tx); tx.put = async (key, value) => { this.writes.push({key, bytes: JSON.stringify(value).length}); return txPut(key, value); }; return closure(tx); }); } async writesSeen() { return this.writes; } async seedChunked(state) { await this.writeState(state); } } import { duo } from './src/lib/duo-api'; export default { fetch: (request, env) => duo(request, env) };`, resolveDir: process.cwd() }, bundle: true, write: false, format: "esm", platform: "neutral", external: ["cloudflare:workers"] }).outputFiles[0].text;
const persist = await mkdtemp(join(tmpdir(), "1in8bn-duo-test-"));
const options = { name: "duo-room-tests", modules: true, script: output, compatibilityDate: "2026-10-19", durableObjects: { DUO_ROOMS: { className: "DuoRoom", useSQLite: true }, DUO_FIXTURES: { className: "DuoRoomFixture", useSQLite: true } }, durableObjectsPersist: persist };
const runtimeOptions = { ...convertV4MiniflareOptions(options), resourcePersistencePath: persist };
let worker = new Miniflare(runtimeOptions);
after(async () => { await worker.dispose(); await rm(persist, { recursive: true, force: true }); });
async function call(path: string, method = "GET", body?: unknown, token?: string) {
  return worker.dispatchFetch(`https://1in8bn.com/api/duo/rooms${path}`, { method, headers: { Origin: "https://1in8bn.com", "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
test("SQLite room serializes invitation races, persists credentials and settles exactly once across runtime restart", async () => {
  const created = await call("", "POST", { name: "Ari", mode: "short-story" });
  assert.equal(created.status, 201);
  const first = await created.json();
  const path = `/${first.snapshot.roomId}`;
  assert.equal((await call(path)).status, 401);
  assert.equal((await call(path, "GET", undefined, "0".repeat(64))).status, 401);
  const admissionA = "a".repeat(64), admissionB = "b".repeat(64);
  const races = await Promise.all([call(`${path}/join`, "POST", { name: "Bea", inviteSecret: first.inviteSecret, admissionCredential: admissionA }), call(`${path}/join`, "POST", { name: "Third", inviteSecret: first.inviteSecret, admissionCredential: admissionB })]);
  assert.deepEqual(races.map(r => r.status).sort(), [200, 403]);
  const second = await races.find(r => r.status === 200)!.json();
  const retry = await call(`${path}/join`, "POST", { name: "Retried name", inviteSecret: first.inviteSecret, admissionCredential: second.credential });
  assert.equal(retry.status, 200, "a lost successful join response can recover with the retained secret");
  const recoveredJoin = await retry.json();
  assert.equal(recoveredJoin.snapshot.self.id, second.snapshot.self.id);
  assert.equal(recoveredJoin.credential, second.credential);
  assert.equal((await call(`${path}/join`, "POST", { name: "Unrelated", inviteSecret: first.inviteSecret, admissionCredential: "e".repeat(64) })).status, 403);
  let id = 0;
  const command = (token: string, data: object) => call(`${path}/command`, "POST", { id: `integration_${++id}`, ...data }, token);
  for (const token of [first.credential, second.credential]) assert.equal((await command(token, { kind: "ready" })).status, 200);
  assert.equal((await command(first.credential, { kind: "personal", choice: "career", stage: 0, proposalVersion: 0 })).status, 200);
  assert.equal((await command(second.credential, { kind: "personal", choice: "study", stage: 0, proposalVersion: 0 })).status, 200);
  assert.equal((await command(first.credential, { kind: "propose", residence: "together", support: "share", proposalVersion: 0 })).status, 200);
  assert.equal((await command(first.credential, { kind: "approve", proposalVersion: 1 })).status, 200);
  const approval = { id: "durable_approval", kind: "approve", proposalVersion: 1 };
  const approved = await call(`${path}/command`, "POST", approval, second.credential);
  assert.equal(approved.status, 200);
  const snapshot = await approved.json();
  assert.equal(snapshot.phase, "review");
  const expectedBalance = Math.ceil((first.snapshot.self.life.money + second.snapshot.self.life.money + 2_000) / 2);
  assert.equal(snapshot.self.life.money, expectedBalance);
  await worker.dispose();
  worker = new Miniflare(runtimeOptions);
  const recovered = await call(path, "GET", undefined, second.credential);
  assert.equal(recovered.status, 200);
  assert.equal((await recovered.json()).self.life.money, expectedBalance);
  const replayed = await call(`${path}/command`, "POST", approval, second.credential);
  assert.equal(replayed.status, 200);
  const replay = await replayed.json();
  assert.equal(replay.revision, snapshot.revision);
  assert.equal(replay.self.life.money, expectedBalance);
  assert.equal((await call(`${path}/command`, "POST", { ...approval, proposalVersion: 2 }, second.credential)).status, 409);
  for (const token of [first.credential, second.credential]) assert.equal((await command(token, { kind: "continue", stage: 0 })).status, 200);
  const stale = await command(second.credential, { kind: "personal", choice: "care", stage: 0, proposalVersion: 1 });
  assert.equal(stale.status, 409);
  const afterStale = await (await call(path, "GET", undefined, second.credential)).json();
  assert.equal(afterStale.stage, 1);
  assert.equal(afterStale.self.personalChoice, null, "late earlier-stage commands do not choose for the new chapter");
  assert.equal((await command(first.credential, { kind: "close" })).status, 200);
  const closed = await call(path, "GET", undefined, second.credential);
  assert.equal(closed.status, 200);
  assert.equal((await closed.json()).phase, "closed");
  assert.equal((await command(second.credential, { kind: "chat", text: "Still there?" })).status, 410);
});
test('preview is private, renewal invalidates old links, admission recovery survives a consumed invite', async()=>{
 const first=await (await call('','POST',{name:'Private host'})).json();const path=`/${first.snapshot.roomId}`;
 const preview=await call(`${path}/preview`,'POST',{inviteSecret:first.inviteSecret});assert.equal(preview.status,200);
 assert.deepEqual(Object.keys(await preview.json()).sort(),['expiresAt','inviterName','status']);
 const missing=await call('/00000000-0000-4000-8000-000000000000/preview','POST',{inviteSecret:first.inviteSecret});assert.equal(missing.status,404);assert.equal((await missing.json()).reason,'room_not_found');
 const malformed=await call(`${path}/preview`,'POST',{inviteSecret:'null'});assert.equal(malformed.status,403);assert.equal((await malformed.json()).reason,'invitation_missing');
 const bad=await call(`${path}/preview`,'POST',{inviteSecret:'0'.repeat(64)});assert.equal(bad.status,403);assert.equal((await bad.json()).reason,'invalid_invite');
 assert.equal((await call(`${path}/invite`,'POST',{})).status,401);
 const renewed=await call(`${path}/invite`,'POST',{},first.credential);assert.equal(renewed.status,200);const fresh=await renewed.json();assert.notEqual(fresh.inviteSecret,first.inviteSecret);
 assert.equal((await call(`${path}/join`,'POST',{name:'Bea',inviteSecret:first.inviteSecret,admissionCredential:'1'.repeat(64)})).status,403);
 const joined=await call(`${path}/join`,'POST',{name:'Bea',inviteSecret:fresh.inviteSecret,admissionCredential:'1'.repeat(64)});assert.equal(joined.status,200);const second=await joined.json();
 assert.equal((await call(`${path}/invite`,'POST',{},second.credential)).status,403);
 assert.equal((await call(`${path}/invite`,'POST',{},first.credential)).status,409);
 const used=await call(`${path}/preview`,'POST',{inviteSecret:fresh.inviteSecret});assert.equal(used.status,403);assert.equal((await used.json()).reason,'invitation_used');
 const recovery=await call(`${path}/preview`,'POST',{inviteSecret:fresh.inviteSecret,admissionCredential:second.credential});assert.equal(recovery.status,200);assert.equal((await recovery.json()).inviterName,'Private host');
 assert.equal((await call(`${path}/preview`,'POST',{inviteSecret:'0'.repeat(64),admissionCredential:second.credential})).status,403);
});
test("room creation is bounded by a persisted per-network rate gate", async () => {
  const statuses = [];
  for (let i = 0; i < 9; i++) statuses.push((await call("", "POST", { name: "Ari" })).status);
  assert.equal(statuses.at(-1), 429);
  assert.ok(statuses.includes(201));
});


test('two replay votes serialize once and durable old-run receipts never mutate the new story',async()=>{
 const response=await worker.dispatchFetch('https://1in8bn.com/api/duo/rooms',{method:'POST',headers:{Origin:'https://1in8bn.com','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.19'},body:JSON.stringify({name:'Ari',mode:'short-story'})});
 const first=await response.json();const path=`/${first.snapshot.roomId}`;
 const second=await (await call(`${path}/join`,'POST',{name:'Bea',inviteSecret:first.inviteSecret,admissionCredential:'f'.repeat(64)})).json();
 let id=0;const command=async(token:string,data:object)=>{const r=await call(`${path}/command`,'POST',{id:`replay_race_${++id}`,...data},token);assert.equal(r.status,200,JSON.stringify(await r.clone().json()));return r.json();};
 for(const token of [first.credential,second.credential])await command(token,{kind:'ready'});
 let snapshot=first.snapshot;
 for(let stage=0;stage<3;stage++){
  const version=stage*2;
  for(const token of [first.credential,second.credential])await command(token,{kind:'personal',choice:'care',stage,proposalVersion:version,runIndex:0});
  await command(first.credential,{kind:'propose',agree:true,residence:'together',support:'independent',proposalVersion:version});
  snapshot=await command(second.credential,{kind:'approve',proposalVersion:version+1});assert.equal(snapshot.phase,'review');
  for(const token of [first.credential,second.credential])snapshot=await command(token,{kind:'continue',stage,runIndex:0});
 }
 assert.equal(snapshot.phase,'complete');
 const before=snapshot;const voteA={id:'durable_replay_vote_a',kind:'replay',runIndex:0},voteB={id:'durable_replay_vote_b',kind:'replay',runIndex:0};
 const votes=await Promise.all([call(`${path}/command`,'POST',voteA,first.credential),call(`${path}/command`,'POST',voteB,second.credential)]);assert.deepEqual(votes.map(r=>r.status),[200,200]);
 const fresh=await (await call(path,'GET',undefined,second.credential)).json();assert.equal(fresh.runIndex,1);assert.equal(fresh.stage,0);assert.equal(fresh.phase,'planning');assert.equal(fresh.expiresAt,before.expiresAt);assert.deepEqual(fresh.self.archives[0].history,before.history);assert.equal('archives' in fresh.partner,false);
 await worker.dispose();worker=new Miniflare(runtimeOptions);
 const retried=await call(`${path}/command`,'POST',voteB,second.credential);assert.equal(retried.status,200);assert.equal((await retried.json()).revision,fresh.revision);
 const delayed={id:'unique_delayed_personal',kind:'personal',choice:'study',stage:0,proposalVersion:fresh.proposalVersion,runIndex:0};assert.equal((await call(`${path}/command`,'POST',delayed,second.credential)).status,409);
 const after=await(await call(path,'GET',undefined,second.credential)).json();assert.equal(after.runIndex,1);assert.equal(after.self.personalChoice,null);
});


test('human voice membership stays available after completion but rejects closed, expired or absent peers',async()=>{
 const namespace=await worker.getDurableObjectNamespace('DUO_FIXTURES');
 const stub=namespace.get(namespace.idFromName('voice-completion-lifecycle'));
 const now=Date.now(),firstToken='7'.repeat(64),secondToken='8'.repeat(64);
 const state=createDuoState('voice-lifecycle','Ari','first',await duoHash(firstToken),'invite',now);
 joinDuo(state,'Bea','second',await duoHash(secondToken),'invite',now);state.phase='complete';
 const membership=()=>stub.fetch(new Request('https://duo.internal/membership',{headers:{Authorization:`Bearer ${firstToken}`}}));
 await stub.seed(state);const complete=await membership();assert.equal(complete.status,200);assert.equal((await complete.json()).memberId,'first');
 state.phase='closed';await stub.seed(state);assert.equal((await membership()).status,410);
 state.phase='complete';state.pausedBy=['second'];await stub.seed(state);assert.equal((await membership()).status,200);
 state.pausedBy=[];state.members[1].lastSeen=now-40_000;await stub.seed(state);assert.equal((await membership()).status,409);
 state.members[1].lastSeen=now;state.expiresAt=now-1;await stub.seed(state);assert.equal((await membership()).status,410);
});


test('full-life default API and chunked complete lives survive durable restart with private snapshots',async()=>{
 const namespace=await worker.getDurableObjectNamespace('DUO_FIXTURES');
 const stub=namespace.getByName('full-life-persistence');
 const firstToken='c'.repeat(64),secondToken='d'.repeat(64),now=Date.now();
 const created=await stub.fetch(new Request('https://duo.internal/create',{method:'POST',headers:{'Content-Type':'application/json','X-Duo-Room':'cd9bbb21-2111-4123-8123-123456789012'},body:JSON.stringify({name:'Ari'})}));
 assert.equal(created.status,201);const initial=await created.json();assert.equal(initial.snapshot.lifetime.self.life.age,0);assert.equal(initial.snapshot.schemaVersion,2);
 const state=createFullDuoState('durable-full-life','Ari','first',await duoHash(firstToken),'invite',now);
 joinDuo(state,'Bea','second',await duoHash(secondToken),'invite',now);let sequence=0;
 const command=(actor:string,data:Record<string,unknown>)=>applyDuoCommand(state,actor,{id:`durable_full_${++sequence}`,...data} as DuoCommand,now);
 for(const actor of ['first','second'])command(actor,{kind:'ready'});
 for(let ticks=0;ticks<2000&&state.phase!=='complete';ticks++){
  const full=state.lifetime!,event=full.sharedEvent;
  if(event){command('first',{kind:'shared-decline',runIndex:0,eventId:event.id,proposalVersion:state.proposalVersion});continue;}
  const pending=Object.entries(full.players).filter(([,p])=>p.life.pendingDecision);
  if(pending.length){for(const [actor,p] of pending){const decision=p.life.pendingDecision!;command(actor,{kind:'life-choice',runIndex:0,lifeVersion:p.version,decisionId:decision.id,choiceId:(decision.choices.find(c=>c.id==='skip')??decision.choices[0]).id});}continue;}
  command(state.members.find(m=>full.players[m.id].life.alive)!.id,{kind:'life-advance',runIndex:0,clockVersion:full.clockVersion});
 }
 assert.equal(state.phase,'complete');state.receipts={};assert.ok(JSON.stringify(state).length>128*1024,'exercise a real lifetime exceeding one storage value');
 await stub.seedChunked(state);
 const fetchSnapshot=()=>stub.fetch(new Request('https://duo.internal/snapshot',{headers:{Authorization:`Bearer ${firstToken}`}}));
 const response=await fetchSnapshot();assert.equal(response.status,200);const snapshot=await response.json();assert.deepEqual(snapshot.lifetime.self.life,state.lifetime!.players.first.life);assert.equal('life' in snapshot.lifetime.partner,false);
 await worker.dispose();worker=new Miniflare(runtimeOptions);
 const restored=(await worker.getDurableObjectNamespace('DUO_FIXTURES')).getByName('full-life-persistence');
 const reload=await restored.fetch(new Request('https://duo.internal/snapshot',{headers:{Authorization:`Bearer ${firstToken}`}}));assert.equal(reload.status,200);assert.deepEqual((await reload.json()).lifetime.self.life,state.lifetime!.players.first.life);
});

test('full-life consent races settle one commitment and replay the durable receipt exactly once',async()=>{
 const namespace=await worker.getDurableObjectNamespace('DUO_FIXTURES'),stub=namespace.getByName('full-consent-race');
 const now=Date.now(),token='e'.repeat(64),state=createFullDuoState('full-consent','Ari','a','host-hash','invite',now);
 joinDuo(state,'Bea','b',await duoHash(token),'invite',now);let sequence=0;
 const command=(actor:string,data:Record<string,unknown>)=>applyDuoCommand(state,actor,{id:`consent_${++sequence}`,...data} as DuoCommand,now);
 command('a',{kind:'ready'});command('b',{kind:'ready'});
 for(let count=0;count<1000&&!state.lifetime!.sharedEvent;count++){
  const full=state.lifetime!,pending=Object.entries(full.players).filter(([,p])=>p.life.pendingDecision);
  if(pending.length)for(const [actor,p] of pending){const d=p.life.pendingDecision!;command(actor,{kind:'life-choice',runIndex:0,lifeVersion:p.version,decisionId:d.id,choiceId:(d.choices.find(c=>c.id==='skip')??d.choices[0]).id});}
  else command('a',{kind:'life-advance',runIndex:0,clockVersion:full.clockVersion});
 }
 const event=state.lifetime!.sharedEvent!;assert.ok(event);
 command('a',{kind:'shared-propose',runIndex:0,eventId:event.id,proposalVersion:state.proposalVersion,optionId:event.options[0].id});
 command('a',{kind:'shared-approve',runIndex:0,eventId:event.id,proposalVersion:state.proposalVersion});
 state.receipts={};await stub.seedChunked(state);
 const body={id:'full_approval_race',kind:'shared-approve',runIndex:0,eventId:event.id,proposalVersion:state.proposalVersion};
 const approve=()=>stub.fetch(new Request('https://duo.internal/command',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(body)}));
 const responses=await Promise.all([approve(),approve()]);assert.deepEqual(responses.map(r=>r.status),[200,200]);
 const [first,duplicate]=await Promise.all(responses.map(r=>r.json()));assert.equal(first.revision,state.revision+1);assert.equal(duplicate.revision,first.revision);assert.deepEqual(duplicate.lifetime.self,first.lifetime.self);assert.equal(first.lifetime.memories.length,1);
});


test('idle authenticated polls persist only tiny presence and return conditional empty responses', async () => {
 const namespace = await worker.getDurableObjectNamespace('DUO_FIXTURES');
 const stub = namespace.getByName('idle-poll-counts');
 const now = Date.now(), token = '2'.repeat(64), peerToken = '3'.repeat(64);
 const state = createFullDuoState('idle-room', 'Ari', 'first', await duoHash(token), 'invite', now);
 joinDuo(state, 'Bea', 'second', await duoHash(peerToken), 'invite', now);
 // A real large own-Life history: measure storage puts in the actual DO runtime.
 state.lifetime!.players.first.life.reflections = Object.fromEntries(Array.from({length: 1000}, (_, index) => [`moment-${index}`, 'Long lifetime moment '.repeat(15)]));
 await stub.seedChunked(state);
 const poll = (credential = token, etag?: string) => stub.fetch(new Request('https://duo.internal/snapshot', {headers: {Authorization: `Bearer ${credential}`, ...(etag ? {'If-None-Match': etag} : {})}}));
 const first = await poll(); assert.equal(first.status, 200);
 const bytes = (await first.text()).length; assert.ok(bytes > 200_000);
 const etag = first.headers.get('ETag')!; assert.ok(etag);
 await stub.countWrites();
 for(let i = 0; i < 5; i++) { const unchanged = await poll(token, etag); assert.equal(unchanged.status, 304); assert.equal(await unchanged.text(), ''); }
 const writes = await stub.writesSeen();
 assert.equal(writes.filter((write: {key: string}) => write.key.startsWith('room')).length, 0);
 assert.equal(writes.filter((write: {key: string}) => write.key === 'presence').length, 5);
 assert.ok(writes.filter((write: {key: string}) => write.key === 'presence').every((write: {bytes: number}) => write.bytes < 100));
 for (const validator of [`W/${etag}`, `"unrelated", W/${etag}`, `W/"comma,inside", ${etag}`, ` W/"other", ${etag} `, ` , W/${etag}, , `, '*']) {
  const unchanged = await poll(token, validator);assert.equal(unchanged.status,304,validator);assert.equal(await unchanged.text(),'');
 }
 for (const validator of ['W/"mismatch"', '"other", W/"mismatch"', `"other" invalid ${etag}`]) assert.equal((await poll(token,validator)).status,200,validator);
 const peerTag=(await poll(peerToken)).headers.get('ETag')!;
 assert.notEqual(peerTag, etag, 'validators are actor scoped');
 assert.equal((await poll(peerToken,`W/${etag}`)).status,200,'a peer validator never matches this actor');
 assert.equal((await poll(token,`W/${peerTag}`)).status,200);
 assert.equal((await poll('4'.repeat(64),'*')).status,401,'wildcard cannot bypass membership');
 assert.equal((await poll('4'.repeat(64), etag)).status, 401, 'a validator cannot bypass membership');
 const changed = await stub.fetch(new Request('https://duo.internal/command', {method:'POST',headers:{Authorization:`Bearer ${peerToken}`,'Content-Type':'application/json'},body:JSON.stringify({id:'conditional_chat',kind:'chat',text:'A new shared message'})}));
 assert.equal(changed.status, 200);
 assert.ok((await stub.writesSeen()).some((write: {key: string}) => write.key.startsWith('room-part:')), 'counter observes actual transactional room writes on commands');
 const updated = await poll(token, etag); assert.equal(updated.status, 200); assert.equal((await updated.json()).messages.at(-1).text, 'A new shared message');
 console.log(`Actual DO idle polling: ${bytes} byte initial payload; 5 polls = 0 room puts, 5 presence puts (<100 bytes each), 5 empty 304 bodies.`);
});

test('conditional snapshots change at presence and playback time thresholds, and fresh presence survives restart', async () => {
 const namespace = await worker.getDurableObjectNamespace('DUO_FIXTURES');
 let stub = namespace.getByName('presence-thresholds');
 const now = Date.now(), token = '5'.repeat(64), peerToken = '6'.repeat(64);
 const state = createFullDuoState('presence-room', 'Ari', 'first', await duoHash(token), 'invite', now);
 joinDuo(state, 'Bea', 'second', await duoHash(peerToken), 'invite', now);
 state.members[0].lastSeen = now - 34_000;
 state.lifetime!.playback.nextAdvanceAt = now - 2000;
 await stub.seedChunked(state);
 const poll = (credential: string, etag?: string) => stub.fetch(new Request('https://duo.internal/snapshot', {headers:{Authorization:`Bearer ${credential}`, ...(etag ? {'If-None-Match':etag} : {})}}));
 const first = await poll(peerToken), etag = first.headers.get('ETag')!;
 const initial = await first.json(); assert.equal(initial.partner.online,true); assert.equal(initial.lifetime.playback.driver,false);
 await new Promise(resolve => setTimeout(resolve, 1200));
 const away = await poll(peerToken, etag); assert.equal(away.status,200);const absent = await away.json();
 assert.equal(absent.revision, initial.revision);assert.equal(absent.partner.online,false);assert.equal(absent.paused,true);assert.equal(absent.lifetime.playback.driver,true);
 const awayTag = away.headers.get('ETag')!;assert.equal((await poll(peerToken,awayTag)).status,304);
 await poll(token);
 const back = await poll(peerToken,awayTag);assert.equal(back.status,200);assert.equal((await back.json()).partner.online,true);
 // Keep the stored room timestamps deliberately stale. Only the tiny overlay
 // establishes presence after the object is evicted and reconstructed.
 state.members.forEach(member => member.lastSeen = Date.now()-40_000);
 await stub.seedChunked(state);
 await poll(token);await poll(peerToken);
 await worker.dispose();worker = new Miniflare(runtimeOptions);
 stub = (await worker.getDurableObjectNamespace('DUO_FIXTURES')).getByName('presence-thresholds');
 for(const [index, credential] of [token,peerToken].entries()) {
  const response = await stub.fetch(new Request('https://duo.internal/command', {method:'POST',headers:{Authorization:`Bearer ${credential}`,'Content-Type':'application/json'},body:JSON.stringify({id:`presence_ready_${index}`,kind:'ready'})}));
  assert.equal(response.status,200);const snap=await response.json();assert.equal(snap.partner.online,true);if(index===1) assert.equal(snap.phase,'planning');
 }
 const paused = await stub.fetch(new Request('https://duo.internal/command', {method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({id:'presence_pause',kind:'pause'})}));assert.equal(paused.status,200);
 const latest = await poll(peerToken);const latestTag = latest.headers.get('ETag')!;assert.equal((await latest.json()).paused,true);
 state.expiresAt = Date.now()-1;await stub.seedChunked(state);
 assert.equal((await poll(peerToken,latestTag)).status,410,'conditional validators cannot keep an expired room alive');
});


test('public router and actual room honor application validators without CDN HTTP revalidation', async () => {
 const base='https://1in8bn.com/api/duo/rooms';
 const common={Origin:'https://1in8bn.com','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.219'};
 const created=await worker.dispatchFetch(base,{method:'POST',headers:common,body:JSON.stringify({name:'Validator review'})});assert.equal(created.status,201);
 const first=await created.json(),url=`${base}/${first.snapshot.roomId}`;
 const poll=(token=first.credential, custom?:string, standard?:string)=>worker.dispatchFetch(url,{headers:{...common,Authorization:`Bearer ${token}`,...(custom?{'X-Duo-If-None-Match':custom}:{}),...(standard?{'If-None-Match':standard}:{})}});
 const initial=await poll();assert.equal(initial.status,200);const tag=initial.headers.get('X-Duo-ETag')!;assert.ok(tag);assert.equal(tag,initial.headers.get('ETag'));await initial.text();
 for(const [custom,standard] of [[tag,undefined],[`W/${tag}`,'"mismatch"'],[tag,'*']]) {
  const unchanged=await poll(first.credential,custom,standard);assert.equal(unchanged.status,204);assert.equal(await unchanged.text(),'');assert.equal(unchanged.headers.get('X-Duo-ETag'),tag);assert.equal(unchanged.headers.get('Cache-Control'),'no-store');
 }
 assert.equal((await poll(first.credential,'"mismatch"','*')).status,200,'application validator takes precedence');
 assert.equal((await poll(first.credential,undefined,tag)).status,304,'standard validator remains supported');
 assert.equal((await poll('7'.repeat(64),'*','*')).status,401,'neither validator can bypass authorization');
 const changed=await worker.dispatchFetch(`${url}/command`,{method:'POST',headers:{...common,Authorization:`Bearer ${first.credential}`},body:JSON.stringify({id:'app_validator_chat',kind:'chat',text:'Changed while polling'})});assert.equal(changed.status,200);await changed.text();
 const updated=await poll(first.credential,tag);assert.equal(updated.status,200);assert.notEqual(updated.headers.get('X-Duo-ETag'),tag);assert.equal((await updated.json()).messages.at(-1).text,'Changed while polling');
});
