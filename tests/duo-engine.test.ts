import assert from "node:assert/strict";
import test from "node:test";
import { applyDuoCommand, createDuoState, duoSnapshot, joinDuo, DUO_LIFETIME_MS, type DuoCommand, type DuoState } from "../src/lib/duo-engine";
const now = 1_000_000;
let sequence = 0;
function cmd(state: DuoState, actor: string, command: Omit<DuoCommand, "id"> | Record<string, unknown>, time = now) {
  applyDuoCommand(state, actor, { id: `command_${++sequence}`, ...((command.kind === "personal" || command.kind === "continue") ? { stage: state.stage, runIndex: state.runIndex } : {}), ...(command.kind === "personal" ? { proposalVersion: state.proposalVersion } : {}), ...(command.kind === "propose" ? { agree: true } : {}), ...command } as DuoCommand, time);
}
function room() {
  const state = createDuoState("room", "Ari", "first", "first-secret-hash", "invite-hash", now);
  joinDuo(state, "Bea", "second", "second-secret-hash", "invite-hash", now);
  for(const member of state.members) member.life = {money:5000,job:"Starting out",wellbeing:65};
  cmd(state, "first", { kind: "ready" }); cmd(state, "second", { kind: "ready" });
  return state;
}
function choices(state: DuoState) {
  cmd(state, "first", { kind: "personal", choice: "career" });
  cmd(state, "second", { kind: "personal", choice: "study" });
}
function agree(state: DuoState, residence = "together", support = "independent") {
  cmd(state, "first", { kind: "propose", residence, support, proposalVersion: state.proposalVersion });
  cmd(state, "first", { kind: "approve", proposalVersion: state.proposalVersion });
  cmd(state, "second", { kind: "approve", proposalVersion: state.proposalVersion });
}
test("two friends finish exactly three sequential ages and keep independent lives", () => {
  const state = room();
  for (const age of [20, 25, 30]) {
    assert.equal(duoSnapshot(state, "first", now).age, age);
    choices(state); agree(state);
    assert.equal(state.phase, "review");
    cmd(state, "first", { kind: "continue" });
    assert.equal(state.phase, "review", "one friend cannot advance alone");
    cmd(state, "second", { kind: "continue" });
  }
  assert.equal(state.phase, "complete");
  assert.equal(state.stage, 2);
  assert.deepEqual(state.members.map(m => m.history.map(h => h.age)), [[20, 25, 30], [20, 25, 30]]);
  assert.equal(state.members[0].life.money, 46_000);
  assert.equal(state.members[1].life.money, -13_000);
  assert.equal(state.members[0].life.job, "Established professional");
  assert.equal(state.members[1].life.job, "Lifelong learner");
  assert.throws(() => cmd(state, "first", { kind: "continue" }), /complete/);
});
test("a shared proposal requires both explicit approvals and stale versions never settle", () => {
  const state = room(); choices(state);
  cmd(state, "first", { kind: "propose", residence: "together", support: "share", proposalVersion: 0 });
  const version = state.proposalVersion;
  assert.deepEqual(state.proposal?.approvals, ["first"]);
  cmd(state, "first", { kind: "approve", proposalVersion: version });
  assert.equal(state.phase, "planning");
  cmd(state, "second", { kind: "withdraw", proposalVersion: version });
  assert.equal(state.proposal, null);
  assert.throws(() => cmd(state, "second", { kind: "approve", proposalVersion: version }), /changed/);
  assert.throws(() => cmd(state, "second", { kind: "propose", residence: "apart", support: "share", proposalVersion: version }), /changed/);
  agree(state, "apart", "share");
  assert.equal(state.members[0].life.money, state.members[1].life.money);
  assert.equal(state.members[0].life.money, 3_000);
});
test("commands are idempotent across durable serialization and cannot apply effects twice", () => {
  let state = room(); choices(state);
  cmd(state, "first", { kind: "propose", residence: "together", support: "independent", proposalVersion: 0 });
  cmd(state, "first", { kind: "approve", proposalVersion: 1 });
  const command: DuoCommand = { id: "same_approval", kind: "approve", proposalVersion: 1 };
  applyDuoCommand(state, "second", command, now);
  const saved = JSON.stringify(state);
  state = JSON.parse(saved);
  applyDuoCommand(state, "second", command, now);
  assert.equal(JSON.stringify(state), saved);
  const message: DuoCommand = { id: "same_message", kind: "chat", text: "Hello" };
  applyDuoCommand(state, "first", message, now); applyDuoCommand(state, "first", message, now);
  assert.equal(state.messages.length, 1);
  assert.throws(() => applyDuoCommand(state, "first", { ...message, text: "Different" }, now), /different action/);
});
test("later opportunities reflect a friend's own earlier studies and living arrangements", () => {
  const state = room(); choices(state); agree(state, "apart", "share");
  cmd(state, "first", { kind: "continue" }); cmd(state, "second", { kind: "continue" });
  const first = duoSnapshot(state, "first", now), second = duoSnapshot(state, "second", now);
  assert.equal(first.personalOptions.find(o => o.id === "career")?.moneyDelta, 15_000);
  assert.equal(second.personalOptions.find(o => o.id === "career")?.moneyDelta, 19_000);
  assert.match(second.personalOptions[0].description, /Moving|relocation/);
  assert.equal(second.personalOptions[0].wellbeingDelta, -5);
  assert.match(first.sharedTerms.support, /including debt/);
  assert.match(first.history[0].summary, /shared a home|separate homes/);
  assert.equal(first.history[0].summary.includes("career"), false);
});
test("server-only actor and score fields cannot be injected into a command", () => {
  const state = room();
  assert.throws(() => cmd(state, "first", { kind: "personal", choice: "career", actorId: "second" }), /field/);
  assert.throws(() => cmd(state, "first", { kind: "personal", choice: "career", money: 1_000_000 }), /field/);
  assert.equal(state.members[1].personalChoice, null);
});
test("actor-private snapshots never expose invitation, credentials or partner personal state", () => {
  const state = room(); choices(state);
  const snapshot = duoSnapshot(state, "first", now);
  const serialized = JSON.stringify(snapshot);
  for (const secret of ["first-secret-hash", "second-secret-hash", "invite-hash", "credentialHash", "inviteHash"])
    assert.equal(serialized.includes(secret), false);
  assert.equal(snapshot.partner?.personalChosen, true);
  assert.equal("life" in snapshot.partner!, false);
  assert.equal("personalChoice" in snapshot.partner!, false);
  snapshot.self.life.money = 999_999;
  assert.equal(state.members[0].life.money, 5_000);
  assert.throws(() => duoSnapshot(state, "outsider", now), /membership/);
  assert.throws(() => cmd(state, "outsider", { kind: "close" }), /membership/);
});
test("the invitation is single-use, capped at two and time limited", () => {
  const state = createDuoState("room", "Ari", "first", "hash", "invite", now);
  assert.throws(() => joinDuo(state, "Bea", "second", "hash2", "wrong", now), /invalid/);
  assert.equal(state.members.length, 1);
  const expired = structuredClone(state);
  assert.throws(() => joinDuo(expired, "Bea", "second", "hash2", "invite", now + 31 * 60_000), /expired/);
  joinDuo(state, "Bea", "second", "hash2", "invite", now);
  assert.equal(state.inviteHash, null);
  assert.throws(() => joinDuo(state, "Third", "third", "hash3", "invite", now), /used|two/);
  assert.equal(state.members.length, 2);
  assert.throws(() => cmd(state, "first", { kind: "ready" }, now + DUO_LIFETIME_MS), /expired/);
});
test("stale peers and explicit pauses stop advancement but allow chat and withdrawal", () => {
  const state = room(); choices(state);
  cmd(state, "first", { kind: "propose", residence: "apart", support: "independent", proposalVersion: 0 });
  state.members[0].lastSeen = now + 40_000;
  assert.equal(duoSnapshot(state, "first", now + 40_000).paused, true);
  assert.throws(() => cmd(state, "first", { kind: "approve", proposalVersion: 1 }, now + 40_000), /present/);
  cmd(state, "first", { kind: "chat", text: "Come back when ready" }, now + 40_000);
  cmd(state, "first", { kind: "withdraw", proposalVersion: 1 }, now + 40_000);
  state.members[1].lastSeen = now + 40_000;
  cmd(state, "first", { kind: "pause" }, now + 40_000);
  cmd(state, "second", { kind: "pause" }, now + 40_000);
  cmd(state, "first", { kind: "resume" }, now + 40_000);
  assert.equal(duoSnapshot(state, "first", now + 40_000).paused, true);
  assert.throws(() => cmd(state, "first", { kind: "propose", residence: "together", support: "share", proposalVersion: 2 }, now + 40_000), /present/);
  cmd(state, "second", { kind: "resume" }, now + 40_000);
  assert.equal(duoSnapshot(state, "first", now + 40_000).paused, false);
});
test("replacing a proposal clears consent and transfer cannot create money", () => {
  const state = room(); choices(state);
  cmd(state, "first", { kind: "propose", residence: "together", support: "share", proposalVersion: 0 });
  cmd(state, "first", { kind: "approve", proposalVersion: 1 });
  cmd(state, "second", { kind: "propose", residence: "apart", support: "support-partner", proposalVersion: 1 });
  assert.deepEqual(state.proposal?.approvals, ["second"]);
  cmd(state, "first", { kind: "approve", proposalVersion: 2 });
  assert.deepEqual(state.members.map(m => m.life.money), [11_000, -5_000], "the learner has no positive balance available to transfer");
});
test("chat storage and command history are bounded, and closed rooms reject commands", () => {
  const state = room();
  for (let i = 0; i < 100; i++) cmd(state, "first", { kind: "chat", text: `Message ${i}` });
  assert.equal(state.messages.length, 60);
  assert.equal(state.messages[0].text, "Message 40");
  assert.throws(() => cmd(state, "first", { kind: "chat", text: "x".repeat(501) }), /280/);
  state.commandCounts.first = 4096;
  assert.throws(() => cmd(state, "first", { kind: "chat", text: "too many" }), /limit/);
  cmd(state, "second", { kind: "close" });
  assert.throws(() => cmd(state, "second", { kind: "chat", text: "hello" }), /closed/);
});

test('a missing chapter context cannot choose a personal direction',()=>{
 const state=room();
 assert.throws(()=>applyDuoCommand(state,'first',{id:'missing_context',kind:'personal',choice:'care'} as DuoCommand,now),(e:unknown)=>!!e&&typeof e==='object'&&'status' in e&&e.status===409);
 assert.equal(state.members[0].personalChoice,null);
});

test('a delayed personal choice from an earlier chapter cannot change the next chapter',()=>{
 const state=room();choices(state);agree(state);cmd(state,'first',{kind:'continue'});cmd(state,'second',{kind:'continue'});
 assert.equal(state.stage,1);
 assert.throws(()=>applyDuoCommand(state,'first',{id:'delayed_choice',kind:'personal',choice:'care',stage:0} as DuoCommand,now),(e:unknown)=>!!e&&typeof e==='object'&&'status' in e&&e.status===409);
 assert.equal(state.members[0].personalChoice,null);
});

test('a delayed continue cannot consent to reading a later chapter',()=>{
 const state=room();choices(state);agree(state);cmd(state,'first',{kind:'continue'});cmd(state,'second',{kind:'continue'});choices(state);agree(state);
 assert.equal(state.stage,1);assert.equal(state.phase,'review');
 assert.throws(()=>applyDuoCommand(state,'first',{id:'delayed_continue',kind:'continue',stage:0} as DuoCommand,now),(e:unknown)=>!!e&&typeof e==='object'&&'status' in e&&e.status===409);
 assert.equal(state.members[0].continued,false);
});

test('withdrawal invalidates a late personal choice from the same chapter',()=>{
 const state=room();choices(state);
 cmd(state,'first',{kind:'propose',residence:'together',support:'share',proposalVersion:0});
 cmd(state,'second',{kind:'withdraw',proposalVersion:1});
 const original=state.members[0].personalChoice;
 assert.throws(()=>applyDuoCommand(state,'first',{id:'before_withdrawal',kind:'personal',choice:'care',stage:0,proposalVersion:0} as DuoCommand,now),(e:unknown)=>!!e&&typeof e==='object'&&'status' in e&&e.status===409);
 assert.equal(state.members[0].personalChoice,original);
});

test('sending a plan explicitly agrees only for the proposer; a revision discards old consent', () => {
  const state=room();choices(state);
  cmd(state,'first',{kind:'propose',residence:'together',support:'share',proposalVersion:0});
  assert.deepEqual(state.proposal?.approvals,['first']);assert.equal(state.phase,'planning');
  cmd(state,'second',{kind:'propose',residence:'apart',support:'independent',proposalVersion:1});
  assert.deepEqual(state.proposal?.approvals,['second']);assert.equal(state.phase,'planning');
  cmd(state,'second',{kind:'approve',proposalVersion:2});assert.equal(state.phase,'planning');
  cmd(state,'first',{kind:'approve',proposalVersion:2});assert.equal(state.phase,'review');
});
function finish(state:DuoState) {
 for(let i=0;i<3;i++){choices(state);agree(state);cmd(state,'first',{kind:'continue'});cmd(state,'second',{kind:'continue'});}
}
test('replay requires two run-specific votes, keeps private recaps and rejects delayed commands',()=>{
 const state=room();finish(state);const old=structuredClone(duoSnapshot(state,'first',now));
 cmd(state,'first',{kind:'replay',runIndex:0});assert.equal(state.phase,'complete');
 assert.deepEqual(duoSnapshot(state,'second',now).replayVotes,['first']);
 cmd(state,'second',{kind:'replay',runIndex:0});
 const fresh=duoSnapshot(state,'first',now);assert.equal(fresh.runIndex,1);assert.equal(fresh.phase,'planning');assert.equal(fresh.stage,0);
 assert.equal(fresh.expiresAt,old.expiresAt);assert.ok(fresh.proposalVersion>old.proposalVersion);
 assert.deepEqual(fresh.self.archives[0].history,old.history);assert.deepEqual(fresh.self.archives[0].life,old.self.life);
 assert.equal('archives' in fresh.partner!,false);assert.equal(fresh.history.length,0);
 assert.throws(()=>cmd(state,'first',{kind:'replay',runIndex:0}),/run|story/i);
 assert.throws(()=>cmd(state,'first',{kind:'personal',choice:'care',stage:0,runIndex:0}),/run|story/i);
 assert.throws(()=>applyDuoCommand(state,'first',{id:'missing_run',kind:'personal',choice:'care',stage:0,proposalVersion:state.proposalVersion},now),/run|story/i);
 choices(state);agree(state);
 assert.throws(()=>cmd(state,'first',{kind:'continue',stage:0,runIndex:0}),/run|story/i);
 assert.equal(state.members[0].continued,false);
});
test('new origins and circumstances draw reproducibly and independently; legacy rooms stay unknown',()=>{
 const make=()=>createDuoState('seeded-room','Ari','first','hash','invite',now);
 const first=make();const copy=make();assert.deepEqual(duoSnapshot(first,'first',now).self.origin,duoSnapshot(copy,'first',now).self.origin);
 assert.ok(duoSnapshot(first,'first',now).self.origin?.countryId);assert.ok(duoSnapshot(first,'first',now).self.start?.description);
 const origins=new Set<string>(),starts=new Set<string>(),money=new Set<number>();
 for(let i=0;i<80;i++){const s=createDuoState(`room-${i}`,'Ari','first','hash','invite',now);joinDuo(s,'Bea','second','h2','invite',now);const snap=duoSnapshot(s,'first',now);origins.add(snap.self.origin!.countryId);starts.add(snap.self.start!.id);money.add(snap.self.life.money);assert.equal('life' in snap.partner!,false);}
 assert.ok(origins.size>15);assert.ok(starts.size>2);assert.ok(money.size>2);
 const legacy=make() as unknown as Record<string,unknown>;delete legacy.runIndex;delete legacy.replayVotes;
 for(const m of legacy.members as Record<string,unknown>[]){delete m.origin;delete m.start;delete m.archives;}
 const snap=duoSnapshot(legacy as unknown as DuoState,'first',now);assert.equal(snap.runIndex,0);assert.equal(snap.self.origin,null);assert.equal(snap.self.start,null);assert.deepEqual(snap.self.archives,[]);
});
test('repeat care and shared support keep meaningful wellbeing headroom and readable outcomes',()=>{
 const state=room();for(let i=0;i<2;i++){cmd(state,'first',{kind:'personal',choice:'care'});cmd(state,'second',{kind:'personal',choice:'care'});agree(state,'together','share');assert.ok(state.members.every(m=>m.life.wellbeing<95));cmd(state,'first',{kind:'continue'});cmd(state,'second',{kind:'continue'});}
 assert.ok(state.members.every(m=>m.history.every(h=>!h.summary.includes('You reached'))));
 assert.ok(duoSnapshot(state,'first',now).personalOptions.every(o=>o.description.length<180));
});
test('messages accept 280 characters and reject over-limit messages intact',()=>{
 const state=room();cmd(state,'first',{kind:'chat',text:'x'.repeat(280)});assert.equal(state.messages[0].text.length,280);
 assert.throws(()=>cmd(state,'first',{kind:'chat',text:'x'.repeat(281)}),/280/);assert.equal(state.messages.length,1);
});

test('invitation expiry and renewal preserve room lifetime and host ownership', async()=>{
 const {assertDuoInvitation,renewDuoInvite}=await import('../src/lib/duo-engine');
 const state=createDuoState('room','Ari','first','h1','old',now),expiry=state.expiresAt;
 assert.throws(()=>assertDuoInvitation(state,'old',now+30*60_000),(e:any)=>e.status===410&&e.reason==='invitation_expired');
 assert.throws(()=>renewDuoInvite(state,'outsider','new',now),(e:any)=>e.status===403);
 renewDuoInvite(state,'first','new',now+31*60_000);assert.equal(state.expiresAt,expiry);assert.equal(state.inviteExpiresAt,now+61*60_000);
 assert.throws(()=>assertDuoInvitation(state,'old',now+31*60_000),(e:any)=>e.reason==='invalid_invite');
 assert.doesNotThrow(()=>assertDuoInvitation(state,'new',now+31*60_000));
 state.members.push({...structuredClone(state.members[0]),id:'second'});
 assert.throws(()=>assertDuoInvitation(state,'new',now+31*60_000),(e:any)=>e.reason==='room_full');
});
test('replay recaps stay bounded and actor-private without deleting old receipts',()=>{
 const state=room();const original={id:'original_message',kind:'chat',text:'From the first story'} as const;
 applyDuoCommand(state,'first',original,now);
 for(let run=0;run<5;run++) {finish(state);cmd(state,'first',{kind:'replay',runIndex:run});cmd(state,'second',{kind:'replay',runIndex:run});}
 const own=duoSnapshot(state,'first',now);assert.deepEqual(own.self.archives.map(a=>a.runIndex),[2,3,4]);assert.equal(own.self.archives.every(a=>a.history.length===3),true);
 own.self.archives[0].life.money=999999;assert.notEqual(state.members[0].archives[0].life.money,999999);
 assert.equal('archives' in own.partner!,false);assert.equal('life' in own.partner!,false);
 const revision=state.revision;applyDuoCommand(state,'first',original,now);assert.equal(state.revision,revision);assert.equal(state.messages.filter(m=>m.id==='original_message').length,1);
});
test('birth draws use birth weighting and do not tie friends to a shared origin',()=>{
 let india=0,malta=0,different=0;
 for(let i=0;i<600;i++){const state=createDuoState(`demographic-${i}`,'Ari','first','h','invite',now);joinDuo(state,'Bea','second','h2','invite',now);const a=state.members[0].origin!,b=state.members[1].origin!;if(a.countryId==='IND')india++;if(a.countryId==='MLT')malta++;if(a.countryId!==b.countryId)different++;assert.equal(a.weightMode,'births');}
 assert.ok(india>35,'a country with many annual births is not sampled uniformly by country');assert.ok(malta<5);assert.ok(different>450,'friends receive independent draws');
});

test('legacy proposals without an explicit agree flag never silently grant proposer consent',()=>{
 const state=room();choices(state);
 applyDuoCommand(state,'first',{id:'legacy_proposal',kind:'propose',residence:'together',support:'share',proposalVersion:0},now);
 assert.deepEqual(state.proposal?.approvals,[]);
 cmd(state,'second',{kind:'approve',proposalVersion:1});assert.equal(state.phase,'planning');
 cmd(state,'first',{kind:'approve',proposalVersion:1});assert.equal(state.phase,'review');
});
test('replay always requires a run context even for a legacy initial run',()=>{
 const state=room();finish(state);
 assert.throws(()=>applyDuoCommand(state,'first',{id:'missing_replay_run',kind:'replay'} as DuoCommand,now),/run|story/i);
 assert.deepEqual(duoSnapshot(state,'first',now).replayVotes,[]);
});
