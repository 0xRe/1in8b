import { initializeLifetime, addLifetimePlayer, lifetimeSnapshot, applyLifetimeCommand, replayLifetime, LIFETIME_COMMAND_FIELDS, type DuoLifetime, type LifetimeSnapshot, type LifetimeCommand } from "./duo-lifetime";
import { previewCountry } from "./birth-journey";

/** Authoritative rules for two friends making three shared life decisions. */
export const DUO_STAGES = [
  { age: 20, title: "Starting out", description: "A first job, a place on a course, or time for family: choose your own beginning before deciding where to live." },
  { age: 25, title: "A move on the horizon", description: "New work opens up. Your experience and studies shape the offer; living apart brings a relocation cost." },
  { age: 30, title: "A place to return to", description: "Experience opens a steadier role, while care and learning offer different rewards. Decide what a home together means now." },
] as const;
export const PERSONAL_CHOICES = [
  { id: "career", label: "Focus on work", description: "Earn 12,000, become established at work, and spend 6 wellbeing." },
  { id: "study", label: "Keep learning", description: "Spend 4,000 on study, become a learner, and gain 3 wellbeing." },
  { id: "care", label: "Make room for care", description: "Earn 3,000, work flexibly, and gain 5 wellbeing." },
] as const;
export type PersonalChoice = typeof PERSONAL_CHOICES[number]["id"];
export type Residence = "together" | "apart";
export type Support = "independent" | "share" | "support-partner";
export interface DuoOrigin { countryId: string; countryName: string; weightMode: "births" }
export interface DuoStart { id: string; description: string }
export interface DuoArchive { runIndex: number; history: DuoHistory[]; life: DuoLife; origin: DuoOrigin | null; start: DuoStart | null }
export interface DuoLife { money: number; job: string; wellbeing: number }
export interface DuoPersonalOption { id: PersonalChoice; label: string; description: string; moneyDelta: number; wellbeingDelta: number; job: string }
export interface DuoHistory { age: number; choice: PersonalChoice; residence: Residence; support: Support; summary: string }
export interface DuoMessage { id: string; memberId: string; name: string; text: string; at: number }
export interface DuoProposal { version: number; residence: Residence; support: Support; proposerId: string; approvals: string[] }
export interface DuoMember {
  id: string; name: string; credentialHash: string; lastSeen: number; ready: boolean;
  personalChoice: PersonalChoice | null; life: DuoLife; continued: boolean; history: DuoHistory[];
  origin: DuoOrigin | null; start: DuoStart | null; archives: DuoArchive[];
}
export interface DuoState {
  schemaVersion?: 2; lifetime?: DuoLifetime;
  roomId: string; createdAt: number; expiresAt: number; inviteHash: string | null; claimedInviteHash?: string; inviteExpiresAt: number;
  phase: "waiting" | "planning" | "review" | "complete" | "closed";
  stage: number; revision: number; proposalVersion: number; runIndex: number; replayVotes: string[]; members: DuoMember[];
  pausedBy: string[]; proposal: DuoProposal | null; messages: DuoMessage[]; receipts: Record<string, Record<string, string>>; commandCounts: Record<string, number>;
}
export interface DuoSnapshot {
  schemaVersion?: 2; lifetime?: LifetimeSnapshot;
  roomId: string; phase: DuoState["phase"]; runIndex: number; replayVotes: string[]; invitation: { canRenew: boolean; expiresAt: number | null }; stage: number; age: number; revision: number;
  paused: boolean; pausedBy: string[]; proposalVersion: number; pauseReason: string | null; expiresAt: number;
  self: { id: string; name: string; ready: boolean; personalChoice: PersonalChoice | null; life: DuoLife; continued: boolean; origin: DuoOrigin | null; start: DuoStart | null; archives: DuoArchive[] };
  partner: { id: string; name: string; ready: boolean; online: boolean; personalChosen: boolean; continued: boolean; origin: DuoOrigin | null; start: DuoStart | null } | null;
  proposal: DuoProposal | null; messages: DuoMessage[]; history: DuoHistory[];
  personalOptions: DuoPersonalOption[]; sharedTerms: { residence: string; support: string };
  voice: { channel: string; uid: number };
}
export type DuoCommand = LifetimeCommand | { id: string } & (
  | { kind: "ready"; playback?: "manual" | "auto" }
  | { kind: "close" | "pause" | "resume" }
  | { kind: "continue"; stage: number; runIndex?: number }
  | { kind: "personal"; choice: PersonalChoice; stage: number; runIndex?: number; proposalVersion: number }
  | { kind: "propose"; residence: Residence; support: Support; proposalVersion: number; agree?: boolean }
  | { kind: "approve" | "withdraw"; proposalVersion: number }
  | { kind: "chat"; text: string }
  | { kind: "replay"; runIndex: number }
);
export class DuoError extends Error { constructor(public status: number, message: string, public reason?: string) { super(message); } }
export const DUO_LIFETIME_MS = 24 * 60 * 60 * 1000;
export const DUO_PRESENCE_MS = 35_000;
export function cleanDuoName(value: unknown): string {
  if (typeof value !== "string") throw new DuoError(400, "Choose a name");
  const name = value.trim().replace(/[\u0000-\u001f\u007f]/g, "");
  if (!name || name.length > 40) throw new DuoError(400, "Name must be 1–40 characters");
  return name;
}
export function createDuoState(roomId: string, name: string, memberId: string, credentialHash: string, inviteHash: string, now: number): DuoState {
  return { roomId, createdAt: now, expiresAt: now + DUO_LIFETIME_MS, inviteHash, inviteExpiresAt: now + 30 * 60_000,
    phase: "waiting", stage: 0, revision: 0, proposalVersion: 0, runIndex: 0, replayVotes: [],
    members: [newMember(memberId, name, credentialHash, now, roomId, 0)], pausedBy: [], proposal: null, messages: [], receipts: {}, commandCounts: {} };
}
export function createFullDuoState(roomId: string, name: string, memberId: string, credentialHash: string, inviteHash: string, now: number, gentler = true): DuoState {
  const state = createDuoState(roomId,name,memberId,credentialHash,inviteHash,now);
  state.expiresAt = now + 7 * DUO_LIFETIME_MS;
  initializeLifetime(state,gentler); return state;
}
// Independent deterministic streams avoid linking birthplace to fictional means.
function sample(seed: string): number {
  let n = 2166136261;
  for (const char of seed) n = Math.imul(n ^ char.charCodeAt(0), 16777619);
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d); n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}
const STARTS = [
  { id: "small-cushion", description: "A small savings cushion after a steady first year.", money: 8_000, wellbeing: 60 },
  { id: "close-circle", description: "A close circle offers encouragement while you build savings.", money: 3_000, wellbeing: 70 },
  { id: "fresh-start", description: "A fresh start with little saved and room to find your footing.", money: 1_000, wellbeing: 55 },
  { id: "steady-start", description: "Some savings and familiar routines as a new chapter begins.", money: 5_000, wellbeing: 65 },
] as const;
function newMember(id: string, name: string, credentialHash: string, now: number, roomId: string, runIndex: number): DuoMember {
  const seed = `${roomId}|${id}|${runIndex}`;
  const country = previewCountry("births", sample(`${seed}|birth`));
  const start = STARTS[Math.floor(sample(`${seed}|circumstances`) * STARTS.length)];
  return { id, name: cleanDuoName(name), credentialHash, lastSeen: now, ready: false, personalChoice: null,
    life: { money: start.money, job: "Starting out", wellbeing: start.wellbeing }, continued: false, history: [],
    origin: { countryId: country.id, countryName: country.name_en, weightMode: "births" },
    start: { id: start.id, description: start.description }, archives: [] };
}
/** Old rooms keep their observed story; absence is unknown, never reconstructed. */
export function normalizeDuoState(state: DuoState): DuoState {
  state.runIndex ??= 0; state.replayVotes ??= [];
  // Early full-life saves predate optional shared playback; never reroll their lives.
  if (state.lifetime) state.lifetime.playback ??= { mode: "manual", votes: [], running: false, nextAdvanceAt: 0 };
  if (state.lifetime?.sharedEvent) {
    const full = state.lifetime, lives = Object.values(full.players).map(p => p.life);
    if (lives.some(life => life.year !== lives[0].year)) {
      // An early full-life build could offer shared terms across different years.
      // Revoke only the uncommitted offer; never rewind either authoritative life.
      const offeredKey = full.sharedEvent!.id.split(':')[1];
      full.offered = full.offered.filter(key => key !== offeredKey);
      full.sharedEvent = null; full.lastSharedYear = 0;
      full.clockVersion++; full.playback.running = false; state.proposalVersion++; state.revision++;
    }
  }
  for (const member of state.members) { member.origin ??= null; member.start ??= null; member.archives ??= []; }
  return state;
}
function personalOptions(state: DuoState, member: DuoMember): DuoPersonalOption[] {
  const stage = state.stage;
  const studies = member.history.filter(h => h.choice === "study").length;
  const experience = member.history.filter(h => h.choice === "career").length;
  const care = member.history.filter(h => h.choice === "care").length;
  const previous = member.history.at(-1);
  const relocation = stage > 0 && previous?.residence === "apart" ? 2_000 : 0;
  const supported = previous && previous.support !== "independent" ? 1 : 0;
  const careGain = Math.max(1, 5 - care * 2);
  const careerMoney = [12_000, 15_000, 17_000][stage] + studies * 6_000 + experience * 2_000 - relocation;
  const studyMoney = [-4_000, -3_000, -2_000][stage];
  const careMoney = [3_000, 4_000, 5_000][stage] + care * 2_000;
  return [
    { id: "career", label: ["Take a first job", "Follow a new opportunity", "Build a steadier career"][stage], moneyDelta: careerMoney, wellbeingDelta: -6 + supported,
      job: ["First full-time role", "Growing professional", "Established professional"][stage], description: relocation ? "Build work experience. Moving after living apart costs 2,000 credits." : "Build work experience and savings, with less time to recharge." },
    { id: "study", label: ["Start a course", "Return to learning", "Learn a new direction"][stage], moneyDelta: studyMoney, wellbeingDelta: 3 + supported,
      job: ["Student", "Developing a new skill", "Lifelong learner"][stage], description: "Spend savings on learning. Each completed course improves later work opportunities." },
    { id: "care", label: ["Make room for family", "Care for your circle", "Choose time and connection"][stage], moneyDelta: careMoney, wellbeingDelta: careGain + supported,
      job: ["Flexible first role", "Work balanced with care", "Community and flexible work"][stage], description: "Earn less through flexible work and make time for connection. Repeated care brings smaller wellbeing gains." },
  ];
}
export function assertDuoActive(state: DuoState, now: number) {
  if (state.expiresAt <= now) throw new DuoError(410, "This room has expired");
  if (state.phase === "closed") throw new DuoError(410, "This room is closed");
}
export function joinDuo(state: DuoState, name: string, memberId: string, credentialHash: string, inviteHash: string, now: number): void {
  assertDuoActive(state, now);
  assertDuoInvitation(state, inviteHash, now);
  state.members.push(newMember(memberId, name, credentialHash, now, state.roomId, state.runIndex ?? 0));
  if (state.lifetime) addLifetimePlayer(state,memberId);
  state.claimedInviteHash = state.inviteHash!; state.inviteHash = null;
  state.revision++;
}
export function assertDuoInvitation(state: DuoState, inviteHash: string, now: number): void {
  assertDuoActive(state, now);
  // Validate the secret before revealing room occupancy. Consumed secrets retain only a hash.
  if (!state.inviteHash) {
    if (state.claimedInviteHash && state.claimedInviteHash !== inviteHash) throw new DuoError(403, "This invitation is invalid", "invalid_invite");
    throw new DuoError(403, "This invitation has already been used", "invitation_used");
  }
  if (state.inviteHash !== inviteHash) throw new DuoError(403, "This invitation is invalid", "invalid_invite");
  if (state.inviteExpiresAt <= now) throw new DuoError(410, "This invitation has expired", "invitation_expired");
  if (state.members.length >= 2) throw new DuoError(409, "This room already has two friends", "room_full");
}
export function renewDuoInvite(state: DuoState, actorId: string, inviteHash: string, now: number): void {
  assertDuoActive(state, now);
  if (state.members[0]?.id !== actorId) throw new DuoError(403, "Only the host can renew an invitation");
  if (state.members.length !== 1 || !state.inviteHash) throw new DuoError(409, "This room already has two friends", "room_full");
  state.inviteHash = inviteHash; state.inviteExpiresAt = Math.min(state.expiresAt, now + 30 * 60_000); state.revision++;
}
export function duoSnapshot(state: DuoState, actorId: string, now: number): DuoSnapshot {
  normalizeDuoState(state);
  const self = state.members.find(m => m.id === actorId);
  if (!self) throw new DuoError(401, "Room membership required");
  const partner = state.members.find(m => m.id !== actorId);
  const online = !!partner && now - partner.lastSeen <= DUO_PRESENCE_MS;
  return {
    ...(state.lifetime ? { schemaVersion: state.schemaVersion, lifetime: lifetimeSnapshot(state, actorId, now) } : {}),
    roomId: state.roomId, runIndex: state.runIndex, replayVotes: [...state.replayVotes], invitation: { canRenew: state.members[0].id === actorId && state.members.length === 1 && state.phase === "waiting", expiresAt: state.inviteHash ? state.inviteExpiresAt : null }, phase: state.phase, stage: state.stage, age: state.lifetime?.players[actorId].life.age ?? DUO_STAGES[state.stage].age, revision: state.revision,
    paused: !partner || !online || state.pausedBy.length > 0, pausedBy: [...state.pausedBy], proposalVersion: state.proposalVersion, pauseReason: state.pausedBy.length ? "A friend paused this room. Both friends must be ready to return." : !partner ? "Waiting for your friend" : !online ? "Your friend is away. Progress is paused." : null,
    expiresAt: state.expiresAt,
    self: { id: self.id, name: self.name, ready: self.ready, personalChoice: self.personalChoice, life: state.lifetime ? {money:state.lifetime.players[actorId].life.stats.savings,job:state.lifetime.players[actorId].life.stats.job,wellbeing:state.lifetime.players[actorId].life.stats.happiness} : { ...self.life }, continued: self.continued, origin: self.origin ? { ...self.origin } : null, start: self.start ? { ...self.start } : null, archives: structuredClone(self.archives) },
    partner: partner ? { id: partner.id, name: partner.name, ready: partner.ready, online, personalChosen: partner.personalChoice !== null, continued: partner.continued, origin: partner.origin ? { ...partner.origin } : null, start: partner.start ? { ...partner.start } : null } : null,
    proposal: state.proposal ? { ...state.proposal, approvals: [...state.proposal.approvals] } : null,
    messages: state.messages.map(m => ({ ...m })), history: self.history.map(h => ({ ...h })),
    personalOptions: state.lifetime ? [] : personalOptions(state, self),
    sharedTerms: state.lifetime ? {residence:"",support:""} : { residence: "Living together costs each friend 3,000 fictional life credits and adds 2 wellbeing; living apart costs 6,000 each and adds 1 wellbeing. Negative balances are fictional debt carried into the next stage.",
      support: "Independent keeps each balance separate. Share pools both full balances, including debt, then divides them equally and adds 1 wellbeing each. Support partner transfers up to 2,000 available positive credits from the proposer to the other friend, who gains 2 wellbeing. Both friends must approve the same terms." },
    voice: { channel: `duo_${state.roomId}`, uid: state.members.indexOf(self) + 1 },
  };
}
function requireBothPresent(state: DuoState, now: number) {
  if (state.pausedBy.length || state.members.length !== 2 || state.members.some(m => now - m.lastSeen > DUO_PRESENCE_MS))
    throw new DuoError(409, "Both friends must be present to continue");
}
function requireVersion(state: DuoState, version: unknown) {
  if (!Number.isInteger(version) || version !== state.proposalVersion)
    throw new DuoError(409, "The shared proposal changed. Review it again.");
}
function settle(state: DuoState) {
  const proposal = state.proposal!;
  for (const member of state.members) {
    const own = personalOptions(state, member).find(option => option.id === member.personalChoice)!;
    member.life.money += own.moneyDelta;
    member.life.job = own.job;
    member.life.wellbeing += own.wellbeingDelta;
    member.life.money -= proposal.residence === "together" ? 3_000 : 6_000;
    member.life.wellbeing += proposal.residence === "together" ? 2 : 1;
    if (proposal.support === "share") member.life.wellbeing += 1;
  }
  if (proposal.support === "share") {
    const total = state.members.reduce((n, m) => n + m.life.money, 0);
    state.members[0].life.money = Math.floor(total / 2);
    state.members[1].life.money = total - state.members[0].life.money;
  } else if (proposal.support === "support-partner") {
    const giver = state.members.find(m => m.id === proposal.proposerId)!;
    const recipient = state.members.find(m => m.id !== proposal.proposerId)!;
    // A transfer cannot spend money the friend does not have.
    const transfer = Math.min(2_000, Math.max(0, giver.life.money));
    giver.life.money -= transfer; recipient.life.money += transfer;
    recipient.life.wellbeing += 2;
  }
  for (const member of state.members) {
    member.life.wellbeing = Math.max(0, Math.min(100, member.life.wellbeing));
    const direction = member.personalChoice === "career" ? "followed a work opportunity" : member.personalChoice === "study" ? "made time for learning" : "put time into care and connection";
    const support = proposal.support === "share" ? "pooled your balances, including any debt" : proposal.support === "independent" ? "kept your finances independent" : proposal.proposerId === member.id ? "offered your friend support from your available savings" : "accepted your friend's offer of support";
    member.history.push({ age: DUO_STAGES[state.stage].age, choice: member.personalChoice!, residence: proposal.residence, support: proposal.support,
      summary: `At ${DUO_STAGES[state.stage].age}, you ${direction}. You ${proposal.residence === "together" ? "shared a home" : "lived in separate homes"} and ${support}. Your work and learning: ${member.life.job.toLowerCase()}. You have ${member.life.money.toLocaleString("en-US")} life credits${member.life.money < 0 ? " (fictional debt)" : ""} and ${member.life.wellbeing} wellbeing.` });
  }
  state.phase = "review";
}
/** Mutates only after validation. DO serialization makes this a single room transaction. */
export function applyDuoCommand(state: DuoState, actorId: string, command: DuoCommand, now: number): void {
  assertDuoActive(state, now);
  normalizeDuoState(state);
  const actor = state.members.find(m => m.id === actorId);
  if (!actor) throw new DuoError(401, "Room membership required");
  if (!command || typeof command.id !== "string" || !/^[a-zA-Z0-9_-]{8,80}$/.test(command.id)) throw new DuoError(400, "A command ID is required");
  const allowedFields: Record<string, string[]> = { ...LIFETIME_COMMAND_FIELDS, personal: ["choice", "stage", "proposalVersion", "runIndex"], propose: ["residence", "support", "proposalVersion", "agree"], approve: ["proposalVersion"], withdraw: ["proposalVersion"], chat: ["text"], ready: ["playback"], continue: ["stage", "runIndex"], replay: ["runIndex"], close: [], pause: [], resume: [] };
  if (!Object.hasOwn(allowedFields, command.kind) || Object.keys(command).some(key => !["id", "kind", ...allowedFields[command.kind]].includes(key))) throw new DuoError(400, "Unknown room command field");
  const receipts = state.receipts[actorId] ?? {};
  const fingerprint = JSON.stringify(command, Object.keys(command).sort());
  if (Object.hasOwn(receipts, command.id)) {
    if (receipts[command.id] !== fingerprint) throw new DuoError(409, "This command ID was already used for a different action");
    return;
  }
  if ((command.kind === "replay" || command.kind === "personal" || command.kind === "continue") && (command.runIndex !== state.runIndex && !(command.kind !== "replay" && state.runIndex === 0 && command.runIndex === undefined))) throw new DuoError(409, "This story run changed. Refresh the room before choosing again.");
  if ((command.kind === "personal" || command.kind === "continue") && (!Number.isInteger(command.stage) || command.stage !== state.stage)) throw new DuoError(409, "This chapter changed. Refresh the room before choosing again.");
  if ((state.commandCounts[actorId] ?? 0) >= (state.lifetime ? 32768 : 4096) && command.kind !== "close") throw new DuoError(429, "This room reached its command limit");
  if (state.phase === "complete" && command.kind !== "chat" && command.kind !== "close" && command.kind !== "replay") throw new DuoError(409, "Your shared story is complete");
  if (state.lifetime && ['personal','propose','approve','withdraw','continue'].includes(command.kind)) throw new DuoError(400, "Use full-life commands for this room");
  if (Object.hasOwn(LIFETIME_COMMAND_FIELDS,command.kind)) {
    if (!state.lifetime) throw new DuoError(400,"This room uses legacy short-story rules");
    applyLifetimeCommand(state,actorId,command as LifetimeCommand,now);
  } else switch (command.kind) {
    case "pause":
      if (!state.pausedBy.includes(actorId)) state.pausedBy.push(actorId);
      break;
    case "resume": state.pausedBy = state.pausedBy.filter(id => id !== actorId); break;
    case "ready":
      if (state.phase !== "waiting") throw new DuoError(409, "This stage has already started");
      if (state.members.length === 2 && state.members.filter(m => m.id !== actorId).every(m => m.ready)) requireBothPresent(state, now);
      if (command.playback !== undefined && !['manual','auto'].includes(command.playback)) throw new DuoError(400,'Unknown playback mode');
      if (state.lifetime && command.playback !== undefined) {
        const playback = state.lifetime.playback;
        playback.votes = playback.votes.filter(id => id !== actorId);
        if (command.playback === 'auto') playback.votes.push(actorId);
        playback.mode = playback.votes.length ? 'auto' : 'manual';
        playback.running = false; state.lifetime.clockVersion++;
      }
      actor.ready = true;
      if (state.members.length === 2 && state.members.every(m => m.ready)) {
        state.phase = "planning";
        if (state.lifetime) {
          const full = state.lifetime;
          full.playback.running = full.playback.mode === 'auto' && full.playback.votes.length === 2 && Object.values(full.players).every(p => !p.life.pendingDecision);
          full.playback.nextAdvanceAt = now + 2000; full.clockVersion++;
        }
      }
      break;
    case "personal":
      requireVersion(state, command.proposalVersion);
      requireBothPresent(state, now);
      if (state.phase !== "planning" || state.proposal) throw new DuoError(409, "Withdraw the proposal before changing your choice");
      if (!["career", "study", "care"].includes(command.choice)) throw new DuoError(400, "Unknown personal choice");
      actor.personalChoice = command.choice;
      break;
    case "propose":
      requireBothPresent(state, now); requireVersion(state, command.proposalVersion);
      if (state.phase !== "planning" || !state.members.every(m => m.personalChoice)) throw new DuoError(409, "Both friends must choose their own direction first");
      if (!["together", "apart"].includes(command.residence) || !["independent", "share", "support-partner"].includes(command.support)) throw new DuoError(400, "Unknown shared choice");
      if (command.agree !== undefined && typeof command.agree !== "boolean") throw new DuoError(400, "Explicit agreement must be true or false");
      state.proposal = { version: ++state.proposalVersion, residence: command.residence, support: command.support, proposerId: actorId, approvals: command.agree === true ? [actorId] : [] };
      break;
    case "approve":
      requireBothPresent(state, now); requireVersion(state, command.proposalVersion);
      if (state.phase !== "planning" || !state.proposal) throw new DuoError(409, "There is no current proposal to approve");
      if (!state.proposal.approvals.includes(actorId)) state.proposal.approvals.push(actorId);
      if (state.proposal.approvals.length === 2) settle(state);
      break;
    case "withdraw":
      requireVersion(state, command.proposalVersion);
      if (state.phase !== "planning" || !state.proposal) throw new DuoError(409, "There is no current proposal to withdraw");
      state.proposal = null; state.proposalVersion++;
      break;
    case "continue":
      requireBothPresent(state, now);
      if (state.phase !== "review") throw new DuoError(409, "Review this stage together first");
      actor.continued = true;
      if (state.members.every(m => m.continued)) {
        if (state.stage === DUO_STAGES.length - 1) state.phase = "complete";
        else { state.stage++; state.phase = "planning"; state.proposal = null; state.proposalVersion++; for (const m of state.members) { m.personalChoice = null; m.continued = false; } }
      }
      break;
    case "replay": {
      requireBothPresent(state, now);
      if (state.phase !== "complete") throw new DuoError(409, "Finish this story together before replaying");
      if (!state.replayVotes.includes(actorId)) state.replayVotes.push(actorId);
      if (state.members.every(m => state.replayVotes.includes(m.id))) {
        for (const member of state.lifetime ? [] : state.members) {
          const archive: DuoArchive = { runIndex: state.runIndex, life: { ...member.life }, history: member.history.map(h => ({ ...h })), origin: member.origin, start: member.start };
          const fresh = newMember(member.id, member.name, member.credentialHash, member.lastSeen, state.roomId, state.runIndex + 1);
          Object.assign(member, fresh, { ready: true, archives: [...member.archives, archive].slice(-3) });
        }
        state.runIndex++; if (state.lifetime) replayLifetime(state); state.proposalVersion++; state.stage = 0; state.phase = "planning";
        state.proposal = null; state.replayVotes = []; state.pausedBy = [];
      }
      break;
    }
    case "chat": {
      if (typeof command.text !== "string") throw new DuoError(400, "Write a message");
      const text = command.text.trim().replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "");
      if (!text || text.length > 280) throw new DuoError(400, "Messages must be 1–280 characters");
      state.messages.push({ id: command.id, memberId: actorId, name: actor.name, text, at: now });
      state.messages = state.messages.slice(-60);
      break;
    }
    case "close": state.phase = "closed"; state.inviteHash = null; break;
    default: throw new DuoError(400, "Unknown room command");
  }
  state.receipts[actorId] = { ...receipts, [command.id]: fingerprint };
  state.commandCounts[actorId] = (state.commandCounts[actorId] ?? 0) + 1;
  state.revision++;
}
