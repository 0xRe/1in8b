import assert from 'node:assert/strict';
import test from 'node:test';
import { createFullDuoState, createDuoState, joinDuo, applyDuoCommand, duoSnapshot, type DuoCommand, type DuoState } from '../src/lib/duo-engine';
import { advanceTimeline, advanceYear, makeChoice } from '../src/game/engine';
const now = Date.UTC(2026,9,28);
const PARTNER_KEYS = ['age','alive','birthCountry','birthYear','children','country','happiness','health','job','name','pending','portrait','recent','relationship','sex','year'];
let sequence = 0;
function command(state:DuoState, actor:string, data:Record<string,unknown>) { const input = {id:`lifetime_${++sequence}`,runIndex:state.runIndex,...data}; if (['ready','pause','resume','chat','close'].includes(String(data.kind))) delete (input as {runIndex?:number}).runIndex; applyDuoCommand(state,actor,input as DuoCommand,now); }
function room(id='lifetime-seed') { const state=createFullDuoState(id,'Ari','a','hash-a','invite',now);joinDuo(state,'Bea','b','hash-b','invite',now);command(state,'a',{kind:'ready'});command(state,'b',{kind:'ready'});return state; }
function resolve(state:DuoState, accept=false) {
 const full=state.lifetime!;
 if(full.sharedEvent){const event=full.sharedEvent;if(!accept){command(state,'a',{kind:'shared-decline',eventId:event.id,proposalVersion:state.proposalVersion});return;}
 command(state,'a',{kind:'shared-propose',eventId:event.id,proposalVersion:state.proposalVersion,optionId:event.options[0].id});
 for(const actor of ['a','b'])command(state,actor,{kind:'shared-approve',eventId:event.id,proposalVersion:state.proposalVersion});return;}
 for(const actor of ['a','b']){const player=full.players[actor],decision=player.life.pendingDecision;if(!decision)continue;const choice=decision.choices.find(c=>c.id==='skip')??decision.choices[0];
 const expected=makeChoice(player.life,choice.id);command(state,actor,{kind:'life-choice',lifeVersion:player.version,decisionId:decision.id,choiceId:choice.id});assert.deepEqual(player.life,expected,'server decisions exactly use real engine');}
}
test('new lives start at birth with complete modern engine state, independent RNG, and private snapshots',()=>{
 const state=room(),full=state.lifetime!;assert.equal(state.schemaVersion,2);assert.equal(full.players.a.life.age,0);assert.equal(full.players.b.life.age,0);
 assert.ok(full.players.a.life.academics);assert.ok(full.players.a.life.physicalState);assert.notEqual(full.players.a.life.rng,full.players.b.life.rng);
 const snapshot=duoSnapshot(state,'a',now);assert.deepEqual(snapshot.lifetime!.self.life,full.players.a.life);assert.deepEqual(Object.keys(snapshot.lifetime!.partner!).sort(),PARTNER_KEYS);assert.equal('players' in snapshot.lifetime!,false);assert.equal('credentialHash' in snapshot.self,false);
 const legacy=createDuoState('legacy','A','a','h','i',now);assert.equal(duoSnapshot(legacy,'a',now).lifetime,undefined);assert.equal(duoSnapshot(legacy,'a',now).age,20);
});
test('bounded synchronized year/timeline advancement matches the engine from birth to both deaths and survivor continues',()=>{
 const state=room('complete-review-1'),full=state.lifetime!;let survivorTicks=0,decisions=0,ticks=0,boundaryStops=0;
 while(state.phase!=='complete'&&ticks++<2000){
  if(full.sharedEvent||Object.values(full.players).some(p=>p.life.pendingDecision)){decisions++;resolve(state,true);continue;}
  const living=Object.values(full.players).filter(p=>p.life.alive),year=Math.min(...living.map(p=>p.life.year));
  const unfinished=living.some(p=>p.life.year===year&&p.life.timeline&&!p.life.timeline.complete);
  const expected=Object.fromEntries(Object.entries(full.players).map(([id,p])=>[id,!p.life.alive||p.life.year!==year||unfinished&&(!p.life.timeline||p.life.timeline.complete)?p.life:p.life.timeline&&!p.life.timeline.complete?advanceTimeline(p.life,1):advanceYear(p.life,1)]));
  const blocked=Object.entries(expected).some(([id,l])=>full.players[id].life.alive&&full.players[id].life.year===year&&l.year===year&&(l.pendingDecision||!l.alive));
  if(blocked)for(const id of ['a','b'])if(expected[id].year>year){expected[id]=full.players[id].life;boundaryStops++;}
  const before=full.worldYear;command(state,state.members.find(m=>full.players[m.id].life.alive)!.id,{kind:'life-advance',clockVersion:full.clockVersion});
  assert.ok(full.worldYear-before<=1);if(Object.values(full.players).every(p=>p.life.alive))assert.equal(full.players.a.life.year,full.players.b.life.year,'pre-year decisions keep both living characters at the same boundary');for(const id of ['a','b'])assert.deepEqual(full.players[id].life,expected[id]);if(living.length===1)survivorTicks++;
 }
 assert.equal(state.phase,'complete');assert.ok(boundaryStops>0,'the real complete run exercises pre-year blocking decisions');assert.ok(decisions>20);assert.ok(survivorTicks>0);assert.ok(full.players.a.life.history.length>30);assert.ok(full.memories.some(m=>m.title.includes('looking back')));
 const ended=structuredClone(full.players.a.life);command(state,'a',{kind:'chat',text:'Still here with you'});assert.deepEqual(full.players.a.life,ended);
 command(state,'a',{kind:'replay'});assert.equal(state.phase,'complete');command(state,'b',{kind:'replay'});assert.equal(state.phase,'planning');assert.equal(state.lifetime!.players.a.life.age,0);assert.deepEqual(state.lifetime!.players.a.archives[0],ended);
});
test('duplicate/stale clocks, identity replay, absent peers and dead-player control are rejected without changing lives',()=>{
 const state=room();resolve(state);const full=state.lifetime!;
 const advance={id:'advance_once',kind:'life-advance',runIndex:0,clockVersion:full.clockVersion} as const;
 applyDuoCommand(state,'a',advance,now);const after=structuredClone(full);applyDuoCommand(state,'a',advance,now);assert.deepEqual(full,after);
 assert.throws(()=>applyDuoCommand(state,'b',{...advance,id:'advance_stale'},now),/already advanced|decisions/);assert.deepEqual(full,after);
 assert.throws(()=>applyDuoCommand(state,'a',{...advance,clockVersion:999},now),/already used/);
 state.members[1].lastSeen=now-40_000;assert.throws(()=>command(state,'a',{kind:'life-advance',clockVersion:full.clockVersion}),/present/);state.members[1].lastSeen=now;
 full.players.a.life.alive=false;full.players.a.life.pendingDecision=null;assert.throws(()=>command(state,'a',{kind:'life-advance',clockVersion:full.clockVersion}),/friend controls/);
 assert.equal(duoSnapshot(state,'a',now).lifetime!.canAdvance,false);
});
test('shared versions require both explicit consents, withdrawal preserves both lives, and old approvals cannot commit',()=>{
 const state=room('shared-lifetime'),full=state.lifetime!;
 for(let count=0;count<1000&&!full.sharedEvent;count++){if(Object.values(full.players).some(p=>p.life.pendingDecision))resolve(state);else command(state,'a',{kind:'life-advance',clockVersion:full.clockVersion});}
 assert.ok(full.sharedEvent);const event=full.sharedEvent!,before=structuredClone(full.players);
 command(state,'a',{kind:'shared-propose',eventId:event.id,proposalVersion:state.proposalVersion,optionId:event.options[0].id});const version=state.proposalVersion;assert.deepEqual(event.proposal!.approvals,[]);
 command(state,'a',{kind:'shared-approve',eventId:event.id,proposalVersion:version});assert.deepEqual(full.players,before);
 command(state,'b',{kind:'shared-decline',eventId:event.id,proposalVersion:version});assert.deepEqual(full.players,before);
 assert.throws(()=>command(state,'b',{kind:'shared-approve',eventId:event.id,proposalVersion:version}),/changed/);assert.equal(full.sharedEvent,null);
});

test('automatic quiet playback requires two votes and server time gating prevents double-speed or stale timers',()=>{
 const state=room('playback-contract'),full=state.lifetime!;resolve(state);
 command(state,'a',{kind:'life-playback',mode:'auto',clockVersion:full.clockVersion});assert.equal(full.playback.running,false);
 command(state,'b',{kind:'life-playback',mode:'auto',clockVersion:full.clockVersion});assert.equal(full.playback.running,true);
 const automatic={id:'automatic_tick_1',kind:'life-advance',runIndex:0,clockVersion:full.clockVersion,automatic:true} as const;
 assert.throws(()=>applyDuoCommand(state,'a',automatic,now+1000),/not due/);
 applyDuoCommand(state,'a',automatic,now+2000);const after=structuredClone(full);
 applyDuoCommand(state,'a',automatic,now+2000);assert.deepEqual(full,after);
 assert.throws(()=>applyDuoCommand(state,'b',{...automatic,id:'automatic_tick_2'},now+2000),/not due|already advanced|stopped/);assert.deepEqual(full,after);
 command(state,'b',{kind:'life-playback',mode:'manual',clockVersion:full.clockVersion});assert.equal(full.playback.running,false);assert.deepEqual(full.playback.votes,[]);
 assert.throws(()=>applyDuoCommand(state,'a',{...automatic,id:'automatic_stale_3',clockVersion:full.clockVersion},now+4000),/stopped/);
});

test('lobby accepts explicit auto votes but never advances until both members are ready',()=>{
 const state=createFullDuoState('auto-lobby','Ari','a','hash','invite',now),full=state.lifetime!;
 command(state,'a',{kind:'life-playback',mode:'auto',clockVersion:full.clockVersion});assert.equal(full.playback.running,false);
 joinDuo(state,'Bea','b','hash-b','invite',now);
 command(state,'b',{kind:'life-playback',mode:'auto',clockVersion:full.clockVersion});assert.equal(full.playback.running,false);
 command(state,'a',{kind:'ready'});assert.equal(full.playback.running,false);
 command(state,'b',{kind:'ready'});assert.equal(state.phase,'planning');assert.equal(full.playback.running,!Object.values(full.players).some(p=>p.life.pendingDecision));
 state.members[1].lastSeen=now-40_000;
 command(state,'a',{kind:'life-playback',mode:'manual',clockVersion:full.clockVersion});assert.equal(full.playback.running,false,'stopping auto remains possible when a peer is away');
});


test('early full-life saves without playback restore manually without rerolling life or RNG',()=>{
 const state=room('pre-playback-save'),full=state.lifetime!,before=structuredClone(full.players);
 delete (full as {playback?:unknown}).playback;
 const restored=JSON.parse(JSON.stringify(state)) as DuoState;
 const snapshot=duoSnapshot(restored,'a',now);
 assert.deepEqual(restored.lifetime!.players,before);
 assert.deepEqual(restored.lifetime!.playback,{mode:'manual',votes:[],running:false,nextAdvanceAt:0});
 assert.equal(snapshot.lifetime!.playback.running,false);
 assert.deepEqual(snapshot.lifetime!.self.life,before.a.life);
});

test('an early mismatched-year save revokes only uncommitted shared terms and catches up without rerolling',()=>{
 const state=room('mismatched-recovery'),full=state.lifetime!;
 for(const [id,player] of Object.entries(full.players)){
  const target=id==='a'?18:19;
  for(let tick=0;tick<200&&(player.life.age<target||player.life.pendingDecision);tick++){
   const decision=player.life.pendingDecision;
   player.life=decision?makeChoice(player.life,(decision.choices.find(c=>c.id==='skip')??decision.choices[0]).id):player.life.timeline&&!player.life.timeline.complete?advanceTimeline(player.life,1):advanceYear(player.life,1);
  }
  assert.equal(player.life.age,target);assert.equal(player.life.alive,true);
 }
 full.worldYear=full.players.b.life.year;
 full.sharedEvent={id:'0:meeting:2045',title:'Uncommitted old offer',description:'Old terms',options:[{id:'connect',label:'Connect',description:'Old terms'}],proposal:{version:3,optionId:'connect',proposerId:'a',approvals:['a'],lifeVersions:[0,0]}};
 full.offered=['meeting'];state.proposalVersion=3;
 full.memories.push({year:2040,title:'Already agreed memory',summary:'Keep this record.'});
 const before=structuredClone(full.players),memories=structuredClone(full.memories),snapshot=duoSnapshot(state,'a',now);
 assert.equal(snapshot.lifetime!.sharedEvent,null);assert.equal(state.proposalVersion,4);assert.deepEqual(full.players,before);assert.deepEqual(full.memories,memories);
 assert.throws(()=>command(state,'b',{kind:'shared-approve',eventId:'0:meeting:2045',proposalVersion:3}),/changed/);
 for(let tick=0;tick<30&&full.players.a.life.year<full.players.b.life.year;tick++){
  if(full.players.a.life.pendingDecision)resolve(state);else command(state,'a',{kind:'life-advance',clockVersion:full.clockVersion});
  assert.deepEqual(full.players.b.life,before.b.life,'the ahead player cannot spend RNG or settle finance while the other catches up');
  if(full.players.a.life.year<full.players.b.life.year)assert.equal(full.sharedEvent,null);
 }
 assert.equal(full.players.a.life.year,full.players.b.life.year);
});

test('public room and member IDs cannot reconstruct another private birth seed',()=>{
 const first=createFullDuoState('same-public-room','Ari','same-public-member','private-random-credential-hash-a','invite',now);
 const second=createFullDuoState('same-public-room','Ari','same-public-member','private-random-credential-hash-b','invite',now);
 assert.notEqual(first.lifetime!.players['same-public-member'].life.seed,second.lifetime!.players['same-public-member'].life.seed);
 assert.notEqual(first.lifetime!.players['same-public-member'].life.rng,second.lifetime!.players['same-public-member'].life.rng);
 joinDuo(first,'Bea','peer','private-peer-credential-hash','invite',now);
 const snapshot=duoSnapshot(first,'same-public-member',now),serialized=JSON.stringify(snapshot);
 assert.equal(serialized.includes('private-random-credential-hash-a'),false);assert.equal(serialized.includes('private-peer-credential-hash'),false);
 assert.deepEqual(Object.keys(snapshot.lifetime!.partner!).sort(),PARTNER_KEYS);
 const stored=JSON.parse(JSON.stringify(first)) as DuoState,before=structuredClone(stored.lifetime!.players);
 duoSnapshot(stored,'same-public-member',now);assert.deepEqual(stored.lifetime!.players,before,'restoring a persisted life never rerolls seeds or RNG');
});

test('ready records each explicit pace atomically and legacy readiness does not imply auto consent',()=>{
 const state=createFullDuoState('ready-pace','Ari','a','hash-a','invite',now),full=state.lifetime!;
 command(state,'a',{kind:'ready',playback:'auto'});assert.deepEqual(full.playback.votes,['a']);assert.equal(full.playback.running,false);
 joinDuo(state,'Bea','b','hash-b','invite',now);
 command(state,'b',{kind:'ready'});assert.equal(state.phase,'planning');assert.equal(full.playback.running,false);assert.deepEqual(full.playback.votes,['a']);
 const fresh=createFullDuoState('ready-both','Ari','a','hash-a','invite',now);joinDuo(fresh,'Bea','b','hash-b','invite',now);
 command(fresh,'a',{kind:'ready',playback:'auto'});command(fresh,'b',{kind:'ready',playback:'auto'});assert.equal(fresh.lifetime!.playback.running,true);
});

test('propose-and-agree approves exactly that proposal and peer revision invalidates previous agreement',()=>{
 const state=room('explicit-shared'),full=state.lifetime!;
 for(let n=0;n<1000&&!full.sharedEvent;n++){if(Object.values(full.players).some(p=>p.life.pendingDecision))resolve(state);else command(state,'a',{kind:'life-advance',clockVersion:full.clockVersion});}
 const event=full.sharedEvent!,before=structuredClone(full.players);
 command(state,'a',{kind:'shared-propose',eventId:event.id,proposalVersion:state.proposalVersion,optionId:event.options[0].id,agree:true});
 const old=state.proposalVersion;assert.deepEqual(event.proposal!.approvals,['a']);assert.deepEqual(full.players,before);
 command(state,'b',{kind:'shared-propose',eventId:event.id,proposalVersion:old,optionId:event.options[1].id,agree:true});
 assert.deepEqual(event.proposal!.approvals,['b']);assert.throws(()=>command(state,'a',{kind:'shared-approve',eventId:event.id,proposalVersion:old}),/changed/);
 const accept={id:'peer_agrees_once',runIndex:0,kind:'shared-approve',eventId:event.id,proposalVersion:state.proposalVersion} as const;
 applyDuoCommand(state,'a',accept,now);assert.equal(full.sharedEvent,null);const after=structuredClone(full);
 applyDuoCommand(state,'a',accept,now);assert.deepEqual(full,after);
});

test('routine delegation is actor-owned, explicit, bounded, private, and uses real engine choices',()=>{
 const state=room('routine-private'),full=state.lifetime!,a=full.players.a,b=full.players.b;
 assert.deepEqual(a.delegation,{categories:[],resolvedCount:0});
 a.life.pendingDecision={id:'temperament',key:'decision.temperament',type:'choice',age:a.life.age,params:{},choices:[{id:'curious',key:'choice.curious',params:{}}]};
 const expected=makeChoice(a.life,'curious'),other=structuredClone(b);
 const delegate={id:'delegate_once',runIndex:0,kind:'life-delegation',lifeVersion:a.version,categories:['temperament']} as const;
 applyDuoCommand(state,'a',delegate as unknown as DuoCommand,now);assert.deepEqual(a.life,expected);assert.deepEqual(b,other);assert.equal(a.delegation!.resolvedCount,1);
 const after=structuredClone(full);applyDuoCommand(state,'a',delegate as unknown as DuoCommand,now);assert.deepEqual(full,after);
 assert.equal(duoSnapshot(state,'a',now).lifetime!.self.delegation!.resolvedCount,1);
 assert.deepEqual(Object.keys(duoSnapshot(state,'b',now).lifetime!.partner!).sort(),PARTNER_KEYS);
 assert.throws(()=>command(state,'a',{kind:'life-delegation',lifeVersion:a.version,categories:['health']}),/Unknown routine/);
 assert.throws(()=>command(state,'a',{kind:'life-delegation',lifeVersion:0,categories:[]}),/changed/);
 command(state,'a',{kind:'life-delegation',lifeVersion:a.version,categories:[]});assert.deepEqual(a.delegation!.categories,[]);
});

test('delegation never answers health, education, work, marriage, migration or unknown decisions',()=>{
 for(const id of ['health-1','education','job-18','relationship','activity-migration-18','universityMajor-18','new-routine']){
  const state=room(`protected-${id}`),player=state.lifetime!.players.a;
  player.life.pendingDecision={id,key:`decision.${id}`,type:'choice',age:0,params:{},choices:[{id:'skip',key:'choice.skip',params:{}}]};
  const before=structuredClone(player.life);
  command(state,'a',{kind:'life-delegation',lifeVersion:player.version,categories:['temperament','hobbies','reflections']});
  assert.deepEqual(player.life,before,id);assert.equal(player.delegation!.resolvedCount,0);
  assert.throws(()=>command(state,'a',{kind:'life-advance',clockVersion:state.lifetime!.clockVersion}),/decisions/);
 }
});

test('delegated lifetime removes routine stops, preserves synchronized years and stops for important choices',()=>{
 const state=room('delegated-real-life'),full=state.lifetime!;let mandatory=0,routineStops=0;
 for(const actor of ['a','b'])command(state,actor,{kind:'life-delegation',lifeVersion:full.players[actor].version,categories:['temperament','hobbies','reflections']});
 for(let tick=0;tick<2000&&state.phase!=='complete';tick++){
  if(full.sharedEvent){resolve(state);continue;}
  const pending=Object.values(full.players).filter(p=>p.life.pendingDecision);
  if(pending.length){for(const p of pending){if(p.life.pendingDecision!.id==='temperament'||/^hobby(?:-\d+)?$/.test(p.life.pendingDecision!.id)||p.life.pendingDecision!.type==='reflection')routineStops++;else mandatory++;}resolve(state);continue;}
  command(state,state.members.find(m=>full.players[m.id].life.alive)!.id,{kind:'life-advance',clockVersion:full.clockVersion});
  if(Object.values(full.players).every(p=>p.life.alive))assert.equal(full.players.a.life.year,full.players.b.life.year);
 }
 assert.equal(state.phase,'complete');assert.equal(routineStops,0);assert.ok(mandatory>10);assert.ok(Object.values(full.players).reduce((n,p)=>n+p.delegation!.resolvedCount,0)>5);
});

test('resolving a blocking choice resumes prior unanimous playback without new votes',()=>{
 const state=room('resume-after-review'),full=state.lifetime!;
 command(state,'a',{kind:'life-playback',clockVersion:full.clockVersion,mode:'auto'});command(state,'b',{kind:'life-playback',clockVersion:full.clockVersion,mode:'auto'});
 let time=now;
 for(let n=0;n<50&&!Object.values(full.players).some(p=>p.life.pendingDecision);n++){
  time+=2000;for(const member of state.members)member.lastSeen=time;
  applyDuoCommand(state,'a',{id:`auto_review_${n}`,runIndex:0,kind:'life-advance',clockVersion:full.clockVersion,automatic:true},time);
 }
 assert.ok(Object.values(full.players).some(p=>p.life.pendingDecision));assert.equal(full.playback.running,false);
 // Keep fixed test-helper time valid while completing the paused decisions.
 for(const member of state.members)member.lastSeen=now;
 resolve(state);assert.equal(full.playback.running,true);assert.deepEqual(full.playback.votes,['a','b']);
});

test('a fatal health choice stops playback for farewell; deceased delegation cannot restart the survivor',()=>{
 const state=room('fatal-choice-farewell'),full=state.lifetime!,patient=full.players.b;
 command(state,'a',{kind:'life-playback',clockVersion:full.clockVersion,mode:'auto'});command(state,'b',{kind:'life-playback',clockVersion:full.clockVersion,mode:'auto'});
 patient.life.healthcare.episodes.push({id:'health-fatal',patientId:'self',patientName:'Bea',patientAge:patient.life.age,country:patient.life.country.id,diagnosis:'infection',level:'icu',startedAge:patient.life.age,status:'awaiting',treatment:null,cost:0,untreatedRisk:1,access:0,closedAge:null,recoveryUntil:null});
 patient.life.healthcare.activeEpisodeId='health-fatal';
 patient.life.pendingDecision={id:'health-fatal',type:'choice',age:patient.life.age,key:'decision.health',params:{},choices:[{id:'supportiveCare',key:'choice.supportiveCare',params:{}}]};
 const survivorBefore=structuredClone(full.players.a.life),expected=makeChoice(patient.life,'supportiveCare');assert.equal(expected.alive,false,'actual engine resolves a fatal health choice');
 command(state,'b',{kind:'life-choice',lifeVersion:patient.version,decisionId:'health-fatal',choiceId:'supportiveCare'});
 assert.deepEqual(patient.life,expected);assert.deepEqual(full.players.a.life,survivorBefore);assert.equal(full.playback.running,false);
 assert.throws(()=>command(state,'a',{kind:'life-advance',clockVersion:full.clockVersion,automatic:true}),/stopped/);
 const stopped=structuredClone(full);
 assert.throws(()=>command(state,'b',{kind:'life-delegation',lifeVersion:patient.version,categories:['reflections']}),/life has ended/);assert.deepEqual(full,stopped);
 command(state,'a',{kind:'life-advance',clockVersion:full.clockVersion});assert.notDeepEqual(full.players.a.life,survivorBefore,'survivor deliberately continues their remaining life');assert.deepEqual(patient.life,expected);
});

test('operation conflicts distinguish stale life, stale clock, pending decisions and unavailable actions without mutating state',()=>{
 const state=room('operation-diagnostics'),full=state.lifetime!;
 const check=(data:Record<string,unknown>,reason:string)=>{const before=structuredClone(full);assert.throws(()=>command(state,'a',data),(e:unknown)=>e instanceof Error&&(e as {status?:number}).status===409&&(e as {reason?:string}).reason===reason);assert.deepEqual(full,before);};
 check({kind:'life-action',lifeVersion:-1,action:'job-offers'},'stale_life');
 check({kind:'life-advance',clockVersion:-1},'stale_clock');
 for(let i=0;i<20&&!Object.values(full.players).some(p=>p.life.pendingDecision);i++)command(state,'a',{kind:'life-advance',clockVersion:full.clockVersion});
 assert.ok(Object.values(full.players).some(p=>p.life.pendingDecision));
 check({kind:'life-advance',clockVersion:full.clockVersion},'decision_pending');
 check({kind:'life-action',lifeVersion:full.players.a.version,action:'job-offers'},'action_unavailable');
});

test('each friend sees the other life as a public profile without money, medical, private decisions or the seed',()=>{
 const state=room('partner-profile'),full=state.lifetime!,peer=full.players.b.life;
 peer.stats.netAssets=987654321;peer.stats.savings=123456789;peer.stats.health=61.6;peer.stats.happiness=72.4;
 peer.reflections={private:'PRIVATE_REFLECTION_TEXT'};
 peer.events.push(
  {id:'p-everyday',year:peer.year,age:peer.age,key:'PUBLIC_EVERYDAY',params:{},kind:'everyday',icon:'x'},
  {id:'p-health',year:peer.year,age:peer.age,key:'PRIVATE_DIAGNOSIS',params:{},kind:'health',icon:'x'},
  {id:'p-finance',year:peer.year,age:peer.age,key:'PRIVATE_DEBT',params:{amount:5555},kind:'finance',icon:'x'},
  {id:'p-decision',year:peer.year,age:peer.age,key:'PRIVATE_DECISION',params:{},kind:'decision',icon:'x'},
  {id:'p-reflection',year:peer.year,age:peer.age,key:'PRIVATE_REFLECTION',params:{},kind:'reflection',icon:'x'},
 );
 peer.pendingDecision={id:'peer-choice',key:'PRIVATE_PENDING',type:'choice',age:peer.age,params:{},choices:[{id:'x',key:'PRIVATE_CHOICE',params:{}}]};
 const partner=duoSnapshot(state,'a',now).lifetime!.partner!,serialized=JSON.stringify(partner);
 assert.equal(partner.name,peer.name);assert.equal(partner.sex,peer.sex);assert.equal(partner.age,peer.age);assert.equal(partner.pending,true);
 assert.equal(partner.health,62);assert.equal(partner.happiness,72);assert.ok(partner.country.length>0);assert.ok(partner.birthCountry.length>0);
 assert.ok(partner.portrait.length>0,'friend sees the same drawn face');
 assert.deepEqual(partner.recent.map(e=>e.key)[0],'PUBLIC_EVERYDAY');assert.ok(partner.recent.length<=4);
 for(const hidden of ['PRIVATE_DIAGNOSIS','PRIVATE_DEBT','PRIVATE_DECISION','PRIVATE_REFLECTION','PRIVATE_PENDING','PRIVATE_CHOICE','987654321','123456789','5555'])assert.equal(serialized.includes(hidden),false,hidden);
 for(const key of ['life','seed','rng','stats','events','reflections','pendingDecision'])assert.equal(key in partner,false,key);
 assert.equal(serialized.includes(String(peer.seed)),false,'the life seed behind future draws stays private');
 partner.recent[0].params.injected='x';assert.equal('injected' in peer.events.at(-5)!.params,false,'snapshot params are copies');
});

test('childhood letters require both consents and complete after three joint years', () => {
 const state = room('childhood-letters'), full = state.lifetime!;
 for (let step = 0; step < 100 && !full.sharedEvent; step++) {
  if (Object.values(full.players).some(player => player.life.pendingDecision)) resolve(state);
  else command(state,'a',{ kind:'life-advance',clockVersion:full.clockVersion });
 }
 const event = full.sharedEvent!;
 assert.ok(event.id.includes('childhood-letters'));
 assert.ok(full.players.a.life.age < 18);
 command(state,'a',{kind:'shared-propose',eventId:event.id,proposalVersion:state.proposalVersion,optionId:'goal:letters',agree:true});
 assert.equal(full.sharedGoal,undefined);
 command(state,'b',{kind:'shared-approve',eventId:event.id,proposalVersion:state.proposalVersion});
 assert.equal(duoSnapshot(state,'b',now).lifetime?.sharedGoal?.progress,0);
 assert.equal(full.bond,1);
 for (let step = 0; step < 100 && full.sharedGoal; step++) {
  if (Object.values(full.players).some(player => player.life.pendingDecision)) resolve(state);
  else command(state,'a',{kind:'life-advance',clockVersion:full.clockVersion});
 }
 assert.equal(full.sharedGoal,undefined);
 assert.equal(full.bond,3);
 assert.ok(full.memories.some(memory => /after 3 shared years/.test(memory.summary)));
});
