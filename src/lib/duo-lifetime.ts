import { createNewGame } from '../game/new-game';
import { selectNewFocus, newFocusOptions } from '../game/school-focus';
import { advanceYear, advanceTimeline, makeChoice, DEFAULT_SETTINGS, setFocus, invest, requestJobOffers, requestActivity, chooseHobby, trainHobby, buyBelonging, relocate, setLifestyle, spend, setAnnualSpending, addReflection, toggleHobbySpending, toggleAutomaticHobbyLessons, requestHobbyChoices, adoptPet, PET_KINDS, type Life } from '../game/engine';
import { DuoError, DUO_PRESENCE_MS, type DuoState } from './duo-engine';
import { countryName } from '../game/countries';
import { portraitPaths, type PortraitPath } from './portrait';
import type { GameEvent } from '../game/types';

export const FULL_LIFE_RULES = 'full-life-v1' as const;
export type RoutineCategory = 'temperament' | 'hobbies' | 'reflections';
export interface LifeDelegation { categories: RoutineCategory[]; resolvedCount: number; lastOutcome?: string }
export interface LifetimePlayer { life: Life; version: number; archives: Life[]; delegation?: LifeDelegation }
export interface SharedMemory { year: number; title: string; summary: string }
const SHARED_GOALS = {
  letters: { label: 'Write letters to each other', description: 'Follow three shared years, one letter at a time.', target: 3 },
  tradition: { label: 'Start a yearly tradition', description: 'Keep a shared tradition for three years and add it to your memories.', target: 3 },
  learning: { label: 'Make a learning pact', description: 'Count years when at least one of you is a student. Your personal priorities stay yours.', target: 2 },
  reunion: { label: 'Make time for a reunion', description: 'Build toward a reunion by living through three more years together.', target: 3 },
} as const;
type SharedGoalId = keyof typeof SHARED_GOALS;
interface SharedGoal { id: SharedGoalId; until: number; lastYear: number; progress: number }
export interface SharedLifeEvent {
  id: string; title: string; description: string;
  options: { id: string; label: string; description: string }[];
  proposal: { version: number; optionId: string; proposerId: string; approvals: string[]; lifeVersions: number[] } | null;
}
export interface LifePlayback {mode: 'manual' | 'auto'; votes: string[]; running: boolean; nextAdvanceAt: number}
export interface DuoLifetime {
  playback: LifePlayback;
  rulesVersion: typeof FULL_LIFE_RULES; worldYear: number; clockVersion: number;
  players: Record<string, LifetimePlayer>; sharedEvent: SharedLifeEvent | null; memories: SharedMemory[];
  commitment?: { title: string; since: number; until: number; focus: string; fulfilled: number; lastYear: number }; followup?: { title: string; fulfilled: number };
  offered: string[]; lastSharedYear: number; gentler: boolean;
  bond?: number; sharedGoal?: SharedGoal;
}
export interface LifetimeSnapshot {
  playback: LifePlayback & {driver:boolean};
  rulesVersion: typeof FULL_LIFE_RULES; worldYear: number; clockVersion: number; proposalVersion: number;
  self: LifetimePlayer; partner: LifetimePartner | null;
  sharedEvent: SharedLifeEvent | null; memories: SharedMemory[]; commitment?: DuoLifetime["commitment"]; canAdvance: boolean;
  bond?: number; sharedGoal?: SharedGoal & { label: string; target: number };
}
/**
 * What one friend may see of the other's life: identity, place, work, family size,
 * wellbeing and recent everyday headlines. Money, medical events, private decisions,
 * written reflections and the life seed stay with their owner.
 */
export interface LifetimePartner {
  age: number; alive: boolean; pending: boolean;
  name: string; sex: string; year: number; birthYear: number;
  birthCountry: string; country: string; job: string;
  relationship: Life['relationship']['status']; children: number;
  health: number; happiness: number;
  portrait: PortraitPath[];
  recent: Pick<GameEvent, 'id' | 'age' | 'year' | 'key' | 'params' | 'kind'>[];
}
const SHAREABLE_EVENT_KINDS = new Set<GameEvent['kind']>(['birth', 'milestone', 'everyday', 'career', 'family', 'death']);
export function lifetimePartnerView(life: Life): LifetimePartner {
  const recent = life.events.filter(e => SHAREABLE_EVENT_KINDS.has(e.kind)).slice(-4).reverse()
    .map(({ id, age, year, key, params, kind }) => ({ id, age, year, key, params: structuredClone(params), kind }));
  return {
    age: life.age, alive: life.alive, pending: !!life.pendingDecision,
    name: life.name, sex: life.sex, year: life.year, birthYear: life.birthYear,
    birthCountry: countryName(life.migration.birthCountry, 'en'), country: countryName(life.country, 'en'), job: life.stats.job,
    relationship: life.relationship.status, children: life.family.children.length,
    health: Math.round(life.stats.health), happiness: Math.round(life.stats.happiness),
    // Pre-drawn so the friend sees the same face without learning the seed behind every future draw.
    portrait: portraitPaths({ seed: life.seed, age: life.age, sex: life.sex }),
    recent,
  };
}export type LifeAction = 'focus' | 'invest' | 'job-offers' | 'activity' | 'hobby' | 'train-hobby' | 'buy' | 'relocate' | 'lifestyle' | 'spending' | 'annual-spending' | 'reflection' | 'hobby-spending' | 'hobby-lessons' | 'stage-focus' | 'hobby-search' | 'pet';
export type LifetimeCommand = { id: string; runIndex: number } & (
  | { kind: 'life-advance'; clockVersion: number; automatic?:boolean }
  | { kind: 'life-playback'; clockVersion: number; mode:'manual'|'auto' }
  | { kind: 'life-delegation'; lifeVersion: number; categories: RoutineCategory[] }
  | { kind: 'life-choice'; lifeVersion: number; decisionId: string; choiceId: string }
  | { kind: 'life-action'; lifeVersion: number; action: LifeAction; value?: string; secondary?: string; amount?: number }
  | { kind: 'shared-propose'; eventId: string; proposalVersion: number; optionId: string; agree?: boolean }
  | { kind: 'shared-approve' | 'shared-decline'; eventId: string; proposalVersion: number }
);
export const LIFETIME_COMMAND_FIELDS: Record<string, string[]> = {
  'life-delegation': ['runIndex','lifeVersion','categories'],
  'life-playback': ['runIndex','clockVersion','mode'], 'life-advance': ['runIndex', 'clockVersion','automatic'], 'life-choice': ['runIndex', 'lifeVersion', 'decisionId', 'choiceId'],
  'life-action': ['runIndex', 'lifeVersion', 'action', 'value', 'secondary', 'amount'],
  'shared-propose': ['runIndex', 'eventId', 'proposalVersion', 'optionId', 'agree'],
  'shared-approve': ['runIndex', 'eventId', 'proposalVersion'], 'shared-decline': ['runIndex', 'eventId', 'proposalVersion'],
};
function seed(text: string) { let value = 2166136261; for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619); return value >>> 0; }
export function initializeLifetime(state: DuoState, gentler = true) {
  state.schemaVersion = 2;
  state.lifetime = { playback: {mode:'manual',votes:[],running:false,nextAdvanceAt:0}, rulesVersion: FULL_LIFE_RULES, worldYear: 2026, clockVersion: 0, players: {}, sharedEvent: null, memories: [], offered: [], lastSharedYear: 0, gentler };
  for (const member of state.members) addLifetimePlayer(state, member.id);
}
export function addLifetimePlayer(state: DuoState, id: string) {
  const full = state.lifetime!;
  const member = state.members.find(m => m.id === id)!;
  // The credential is generated from 256 cryptographic random bits. Its hash
  // stays server-private: public room/member IDs must never reveal a life seed.
  const life = createNewGame({ ...DEFAULT_SETTINGS, gentler: full.gentler, dailyThemeDay: new Date(state.createdAt).toISOString().slice(0,10) }, seed(`${member.credentialHash}|${state.roomId}|${id}|${state.runIndex}|full-life`));
  full.players[id] = { life, version: 0, archives: [], delegation: {categories:[],resolvedCount:0} };
  member.origin = { countryId: life.country.id, countryName: life.country.name_en, weightMode: 'births' };
  member.start = null;
}
export function lifetimeSnapshot(state: DuoState, actorId: string, now: number): LifetimeSnapshot {
  const full = state.lifetime!, partner = state.members.find(m => m.id !== actorId), other = partner && full.players[partner.id];
  const goal = full.sharedGoal;
  return { playback: {...full.playback,votes:[...full.playback.votes],driver:full.players[actorId].life.alive && (state.members.find(m => full.players[m.id].life.alive)?.id === actorId || now >= full.playback.nextAdvanceAt + 3000)}, rulesVersion: full.rulesVersion, worldYear: full.worldYear, clockVersion: full.clockVersion, proposalVersion: state.proposalVersion,
    self: structuredClone(full.players[actorId]), partner: other ? lifetimePartnerView(other.life) : null,
    sharedEvent: structuredClone(full.sharedEvent), memories: structuredClone(full.memories), commitment: structuredClone(full.commitment),
    bond: full.bond ?? 0,
    sharedGoal: goal && { ...goal, label: SHARED_GOALS[goal.id].label, target: SHARED_GOALS[goal.id].target },
    canAdvance: full.players[actorId].life.alive && state.phase === 'planning' && !full.sharedEvent && !state.pausedBy.length && state.members.length === 2 && state.members.every(m => now - m.lastSeen <= DUO_PRESENCE_MS) && Object.values(full.players).every(p => !p.life.pendingDecision),
  };
}
/** An explicit, closed routine whitelist. Unknown/new decisions always stop. */
function delegateRoutines(player: LifetimePlayer) {
  const policy = player.delegation;
  if (!policy?.categories.length) return;
  for (let step = 0; step < 8; step++) {
    const decision = player.life.pendingDecision;
    if (!decision) return;
    const category: RoutineCategory | null = decision.id === 'temperament' && decision.key === 'decision.temperament' ? 'temperament'
      : /^hobby(?:-\d+)?$/.test(decision.id) && ['decision.hobby','decision.hobbyAgain'].includes(decision.key) ? 'hobbies'
      : decision.type === 'reflection' && /^reflection-\d+$/.test(decision.id) ? 'reflections' : null;
    if (!category || !policy.categories.includes(category)) return;
    const choices = decision.choices;
    const selected = category === 'reflections' ? choices.find(c => c.id === 'skip')
      : category === 'hobbies' && choices.some(c => c.id === 'keepHobbies') ? choices.find(c => c.id === 'keepHobbies')
      : choices[seed(`${player.life.rng}|${decision.id}|routine`) % choices.length];
    if (!selected) return;
    const next = makeChoice(player.life,selected.id);
    if (next === player.life) return;
    player.life = next; player.version++; policy.resolvedCount++;
    policy.lastOutcome = category === 'reflections' ? 'Skipped optional reflection writing.' : category === 'hobbies' ? (selected.id === 'keepHobbies' ? 'Kept your existing hobbies.' : `Chose the offered hobby: ${selected.id}.`) : `Chose childhood temperament: ${selected.id}.`;
  }
}
function resumePlayback(state: DuoState, now: number) {
  const full = state.lifetime!;
  full.playback.running = full.playback.mode === 'auto' && state.members.length === 2 && state.members.every(m => full.playback.votes.includes(m.id) && now - m.lastSeen <= DUO_PRESENCE_MS) && state.phase === 'planning' && !state.pausedBy.length && !full.sharedEvent && Object.values(full.players).every(p => !p.life.pendingDecision);
  full.playback.nextAdvanceAt = now + 2000;
}
function present(state: DuoState, now: number) {
  if (state.pausedBy.length || state.members.length !== 2 || state.members.some(m => now - m.lastSeen > DUO_PRESENCE_MS)) throw new DuoError(409, 'Both friends must be present to continue');
}
function refreshClock(state: DuoState) {
  const full = state.lifetime!, lives = Object.values(full.players).map(p => p.life);
  full.worldYear = Math.max(...lives.map(l => l.year)); full.clockVersion++;
  if (lives.every(l => !l.alive)) { state.phase = 'complete';  }
}
/** Public event text reveals no diagnosis, assets, partner identity or private decision. */
function settleCommitment(state: DuoState) {
  const full = state.lifetime!, commitment = full.commitment;
  if (!commitment || full.worldYear <= commitment.lastYear) return;
  const lives = Object.values(full.players).map(p => p.life);
  if (lives.every(l => l.alive && l.stageFocus?.selection.current === commitment.focus)) commitment.fulfilled++;
  commitment.lastYear = full.worldYear;
  if (full.worldYear >= commitment.until || lives.some(l => !l.alive)) {
    full.memories.push({ year: full.worldYear, title: `${commitment.title}: looking back`, summary: `You kept the agreed focus together for ${commitment.fulfilled} yearly transitions. Personal circumstances and individual changes remained yours to decide. The engine calculated the actual effects on your two lives.` });
    full.followup = { title: commitment.title, fulfilled: commitment.fulfilled }; delete full.commitment;
  }
}
function settleSharedGoal(full: DuoLifetime, lives: Life[]) {
  const goal = full.sharedGoal;
  if (!goal) return;
  const bothAlive = lives.every(life => life.alive);
  const goalInfo = SHARED_GOALS[goal.id];
  if (bothAlive && lives.every(life => life.year > goal.lastYear)) {
    goal.lastYear = full.worldYear;
    if (goal.id !== 'learning' || lives.some(life => life.stats.employment === 'student')) goal.progress++;
  }
  if (bothAlive && goal.progress < goalInfo.target && full.worldYear < goal.until) return;
  const finished = goal.progress >= goalInfo.target;
  if (finished) full.bond = (full.bond ?? 0) + 2;
  full.memories.push({
    year: full.worldYear,
    title: goalInfo.label,
    summary: finished ? `You reached your goal after ${goal.progress} shared years. Your friendship grew.`
      : `You shared ${goal.progress} of ${goalInfo.target} years toward this goal and kept those memories.`,
  });
  delete full.sharedGoal;
}

function goalOption(id: SharedGoalId) {
  const { label, description } = SHARED_GOALS[id];
  return { id: `goal:${id}`, label, description };
}

function offerEvent(state: DuoState) {
  const full = state.lifetime!, lives = Object.values(full.players).map(p => p.life);
  settleCommitment(state);
  settleSharedGoal(full, lives);
  if (full.sharedEvent || full.commitment || full.sharedGoal || lives.length !== 2 || lives.some(l => !l.alive || l.pendingDecision || l.year !== lives[0].year)) return;
  const age = Math.min(...lives.map(life => life.age));
  if (age < 18) {
    const id = age >= 13 ? 'childhood-tradition' : age >= 6 ? 'childhood-letters' : undefined;
    if (!id || full.offered.includes(id) || full.worldYear - full.lastSharedYear < 5) return;
    const letters = id === 'childhood-letters';
    full.offered.push(id);
    full.lastSharedYear = full.worldYear;
    full.playback.running = false;
    full.sharedEvent = {
      id: `${state.runIndex}:${id}:${full.worldYear}`,
      title: letters ? 'A friend far away' : 'A tradition of your own',
      description: letters ? 'You both have stories from growing up. Start exchanging letters and see what changes over the next few years.'
        : 'Your lives are changing. Pick a small tradition you can keep together.',
      options: [goalOption(letters ? 'letters' : 'tradition'), { id: 'independent', label: 'Keep exploring separately', description: 'Continue your lives at your own pace.' }],
      proposal: null,
    };
    state.proposalVersion++;
    return;
  }
  if (!full.followup && full.worldYear - full.lastSharedYear < 5) return;
  const signals: [string, string, string][] = [
    ...(full.followup ? [[`followup-${full.worldYear}`, 'Revisit your shared commitment', `Your plan “${full.followup.title}” lasted through ${full.followup.fulfilled} yearly transitions with both agreed priorities intact. You can make a new plan or return to separate routines.`]] as [string,string,string][] : []),
    ['meeting', 'Two paths meet', 'You are both adults now. Decide whether to make time for a friendship across your two lives.'],
    ...(lives.some(l => l.healthcare.activeEpisodeId || l.stats.health < 45) ? [['support', 'Making room for support', 'Life can call for extra care. You may agree to regular check-ins without sharing private medical details.']] as [string,string,string][] : []),
    ...(lives.some(l => l.stats.employment === 'retired') ? [['retirement', 'A different rhythm', 'Retirement has changed the rhythm of life. Decide whether to set aside time for your friendship.']] as [string,string,string][] : []),
    ...(lives.some(l => l.family.children.length) ? [['family', 'Room for friendship and family', 'Family responsibilities and friendship both take time. Decide together how to stay connected.']] as [string,string,string][] : []),
    ...(lives.some(l => l.stats.employment === 'employed') ? [['work', 'Keeping in touch through change', 'Working life brings new routines. Decide whether to make regular space for each other.']] as [string,string,string][] : []),
    ...(lives.some(l => l.age >= 70) ? [['later', 'Time together in later life', 'Your lives have travelled a long way. Choose whether to make space for shared recollection.']] as [string,string,string][] : []),
  ];
  const signal = signals.find(([id]) => !id.startsWith('followup-') && !full.offered.includes(id)) ?? signals.find(([id]) => !full.offered.includes(id)); if (!signal) return;
  const [id, title, description] = signal; delete full.followup; full.offered.push(id); full.lastSharedYear = full.worldYear;
  const priorities = id === 'work' ? ['balance','learn'] : id === 'support' ? ['health','family'] : id === 'retirement' || id === 'later' ? ['family','health'] : ['family','balance'];
  const options = priorities.filter(f => lives.every(l => newFocusOptions(l).some(option => option === f))).map(f => ({ id: `focus:${f}`, label: f === 'family' ? 'Make connection a priority' : f === 'health' ? 'Support healthier routines' : f === 'learn' ? 'Encourage each other to learn' : 'Keep a balanced rhythm', description: `For the next three world years, both choose the “${f}” life focus. This replaces each current priority: the normal engine calculates its education, career, health and relationship trade-offs. Either person can change their own focus later; doing so breaks that year’s shared commitment. No money, move, marriage or medical information is exchanged. Review the outcome together after three years.` }));
  if (!options.length) options.push({ id: 'connect', label: 'Keep in touch', description: 'Record a friendship without changing either life priority. No assets, residence or private details are exchanged.' });
  options.push(goalOption(lives.some(life => life.stats.employment === 'student') ? 'learning' : 'reunion'));
  full.playback.running = false;
  full.sharedEvent = { id: `${state.runIndex}:${id}:${full.worldYear}`, title, description, options: [...options,
    { id: 'independent', label: 'Keep our own arrangements', description: 'No change to either life. Your friendship and room remain open.' },
  ], proposal: null }; state.proposalVersion++;

}
function finishShared(state: DuoState, accepted: boolean) {
  const full = state.lifetime!, event = full.sharedEvent!, option = accepted ? event.proposal?.optionId : 'independent';
  const goalId = option?.startsWith('goal:') ? option.slice(5) : '';
  if (Object.hasOwn(SHARED_GOALS, goalId)) {
    full.sharedGoal = { id: goalId as SharedGoalId, until: full.worldYear + 3, lastYear: full.worldYear, progress: 0 };
  }
  if (accepted && option !== 'independent') full.bond = (full.bond ?? 0) + 1;
  if (option?.startsWith('focus:')) {
    const focus = option.slice(6);
    for (const player of Object.values(full.players)) {
      const selected = newFocusOptions(player.life).find(f => f === focus);
      if (!selected) throw new DuoError(409,'This shared priority is no longer available. Review your plans.');
    }
    for (const player of Object.values(full.players)) { const selected = newFocusOptions(player.life).find(f => f === focus)!; player.life = selectNewFocus(player.life,selected); player.version++; }
    full.commitment = { title: event.title, since: full.worldYear, until: full.worldYear + 3, focus, fulfilled: 0, lastYear: full.worldYear };
  }
  const summary = full.sharedGoal ? `You started a shared goal: ${SHARED_GOALS[full.sharedGoal.id].label.toLowerCase()}.`
    : option?.startsWith('focus:') ? `You agreed to make “${option.slice(6)}” the priority for three years. Either person remains free to change direction.`
      : option === 'connect' ? 'You agreed to keep in touch.' : 'You kept your own arrangements.';
  full.memories.push({ year: full.worldYear, title: event.title, summary });
  full.sharedEvent = null; state.proposalVersion++; refreshClock(state);
}
function ownAction(life: Life, command: Extract<LifetimeCommand, {kind:'life-action'}>): Life {
  const value = command.value ?? '', amount = command.amount ?? 0;
  if (command.value !== undefined && (typeof command.value !== 'string' || command.value.length > 2000) || command.secondary !== undefined && typeof command.secondary !== 'string' || command.amount !== undefined && (!Number.isFinite(amount) || amount < 0 || amount > 1e9)) throw new DuoError(400, 'Invalid life action');
  switch(command.action) {
    case 'stage-focus': { const option = newFocusOptions(life).find(f => f === value); return option && !life.pendingDecision ? selectNewFocus(life,option) : life; }
    case 'hobby-search': return requestHobbyChoices(life);
    case 'pet': { const kind = PET_KINDS.find(k => k === value); return kind ? adoptPet(life,kind,command.secondary ?? '') : life; }
    case 'focus': return setFocus(life,value); case 'invest': return invest(life,value); case 'job-offers': return requestJobOffers(life);
    case 'activity': return requestActivity(life,value); case 'hobby': return chooseHobby(life,value); case 'train-hobby': return trainHobby(life,value);
    case 'buy': return buyBelonging(life,value); case 'relocate': return relocate(life); case 'lifestyle': return setLifestyle(life,value,command.secondary ?? '');
    case 'spending': return spend(life,value,amount); case 'annual-spending': return setAnnualSpending(life,value,amount); case 'reflection': return addReflection(life,value);
    case 'hobby-spending': return toggleHobbySpending(life); case 'hobby-lessons': return toggleAutomaticHobbyLessons(life);
    default: throw new DuoError(400, 'Unknown life action');
  }
}
export function applyLifetimeCommand(state: DuoState, actorId: string, command: LifetimeCommand, now: number) {
  const full = state.lifetime!, player = full.players[actorId];
  if (command.runIndex !== state.runIndex) throw new DuoError(409, 'This life run changed. Refresh the room.');
  if (command.kind === 'life-playback') {
    if (command.clockVersion !== full.clockVersion) throw new DuoError(409,'Playback changed. Review the current room.');
    if (!['manual','auto'].includes(command.mode)) throw new DuoError(400,'Unknown playback mode');
    if (command.mode === 'manual') full.playback = {mode:'manual',votes:[],running:false,nextAdvanceAt:0};
    else {
      full.playback.mode='auto';
      if (!full.playback.votes.includes(actorId)) full.playback.votes.push(actorId);
      full.playback.running=state.phase === 'planning' && state.members.length === 2 && !state.pausedBy.length && state.members.every(m=>now-m.lastSeen<=DUO_PRESENCE_MS) && full.playback.votes.length===2 && !full.sharedEvent && Object.values(full.players).every(p=>!p.life.pendingDecision);
      full.playback.nextAdvanceAt=now+2000;
    }
    full.clockVersion++; return;
  }
  if (command.kind === 'life-delegation') {
    if (!player.life.alive) throw new DuoError(409,'Your life has ended. You can stay to chat and accompany your friend.');
    if (command.lifeVersion !== player.version) throw new DuoError(409,'Your life changed. Review your routine preferences.');
    if (!Array.isArray(command.categories) || command.categories.length > 3 || command.categories.some(c => !['temperament','hobbies','reflections'].includes(c)) || new Set(command.categories).size !== command.categories.length) throw new DuoError(400,'Unknown routine delegation category');
    player.delegation = {...(player.delegation ?? {resolvedCount:0}),categories:[...command.categories]};
    player.version++;
    if (state.phase === 'planning' && !full.sharedEvent && !state.pausedBy.length && state.members.length === 2 && state.members.every(m => now-m.lastSeen<=DUO_PRESENCE_MS)) delegateRoutines(player);
    refreshClock(state); offerEvent(state); resumePlayback(state,now); return;
  }
  if (state.phase !== 'planning') throw new DuoError(409, 'Both friends must be ready to begin their lives');
  present(state,now);
  if (command.kind === 'life-choice' || command.kind === 'life-action') {
    if (!player.life.alive) throw new DuoError(409, 'Your life has ended. You can stay to chat and accompany your friend.');
    if (full.sharedEvent) throw new DuoError(409, 'Resolve the shared event before changing either life');
    if (command.lifeVersion !== player.version) throw new DuoError(409, 'Your life changed. Review the current event.', 'stale_life');
    const livingBefore = Object.values(full.players).filter(p => p.life.alive).length;
    let next: Life;
    if (command.kind === 'life-choice') {
      if (command.decisionId !== player.life.pendingDecision?.id || !player.life.pendingDecision?.choices.some(c => c.id === command.choiceId)) throw new DuoError(409, 'This decision changed. Review it again.');
      next = makeChoice(player.life,command.choiceId);
    } else next = ownAction(player.life,command);
    if (next === player.life) throw new DuoError(409, 'That action is not available now', 'action_unavailable');
    player.life = next; player.version++; delegateRoutines(player); refreshClock(state); offerEvent(state);
    if (Object.values(full.players).filter(p => p.life.alive).length < livingBefore) full.playback.running = false;
    else resumePlayback(state,now);
    return;
  }
  if (command.kind === 'life-advance') {
    if (command.automatic !== undefined && typeof command.automatic !== 'boolean') throw new DuoError(400,'Invalid playback advance');
    if (command.automatic && !full.playback.running) throw new DuoError(409,'Playback stopped for your review');
    if (full.playback.running && now < full.playback.nextAdvanceAt) throw new DuoError(409,'The next playback step is not due yet');
    if (!player.life.alive) throw new DuoError(409, 'Your friend controls their remaining life. You can stay and chat.');
    if (command.clockVersion !== full.clockVersion) throw new DuoError(409, 'The world has already advanced. Refresh the room.', 'stale_clock');
    if (full.sharedEvent || Object.values(full.players).some(p => p.life.pendingDecision)) throw new DuoError(409, 'Resolve the current decisions before continuing', 'decision_pending');
    // One bounded world-year per command; only explicitly delegated routines resolve. Catch up
    // within the current year before allowing either life into a subsequent year.
    const living = Object.values(full.players).filter(p => p.life.alive);
    const livingCount = living.length;
    const year = Math.min(...living.map(p => p.life.year));
    const unfinished = living.some(p => p.life.year === year && p.life.timeline && !p.life.timeline.complete);
    const rawCandidates = living.filter(p => p.life.year === year && (!unfinished || p.life.timeline && !p.life.timeline.complete)).map(p => ({
      player: p,
      next: p.life.timeline && !p.life.timeline.complete ? advanceTimeline(p.life, 1) : advanceYear(p.life, 1),
    }));
    const candidates = rawCandidates.map(candidate => {
      const staged = {...candidate.player, life:candidate.next, delegation:structuredClone(candidate.player.delegation)};
      delegateRoutines(staged);
      return {...candidate,next:staged.life,delegation:staged.delegation};
    });
    // advanceYear can offer a decision BEFORE entering the new year (career,
    // healthcare, family, etc). Stage both pure results before committing: the
    // other life must not settle next year's economy/RNG ahead of that decision.
    const boundaryBlocked = candidates.some(({ next }) => next.year === year);
    // A delegated pre-year routine may clear its decision while still remaining
    // in this year. The peer must wait for its next annual transition too.
    for (const { player: p, next, delegation } of candidates) {
      if (boundaryBlocked && next.year > year) continue;
      if (next !== p.life) { p.life = next; p.delegation = delegation; p.version++; }
    }
    refreshClock(state); offerEvent(state);
    full.playback.running = full.playback.mode === 'auto' && full.playback.votes.length === 2 && state.phase === 'planning' && !full.sharedEvent && Object.values(full.players).every(p=>!p.life.pendingDecision) && Object.values(full.players).filter(p=>p.life.alive).length === livingCount;
    full.playback.nextAdvanceAt = now + 2000;
    return;
  }
  const event = full.sharedEvent;
  if (!event || command.eventId !== event.id || command.proposalVersion !== state.proposalVersion) throw new DuoError(409, 'The shared event changed. Review it again.');
  if (command.kind === 'shared-decline') { finishShared(state,false); resumePlayback(state,now); return; }
  if (command.kind === 'shared-propose') {
    if (!event.options.some(o => o.id === command.optionId)) throw new DuoError(400, 'Unknown shared option');
    if (command.agree !== undefined && typeof command.agree !== 'boolean') throw new DuoError(400,'Explicit agreement must be true or false');
    event.proposal = { version: ++state.proposalVersion, optionId: command.optionId, proposerId: actorId, approvals: command.agree === true ? [actorId] : [], lifeVersions: state.members.map(m => full.players[m.id].version) }; return;
  }
  const proposal = event.proposal;
  if (!proposal || proposal.lifeVersions.some((v,i) => v !== full.players[state.members[i].id].version)) throw new DuoError(409, 'The lives or proposal changed. Review it again.');
  if (!proposal.approvals.includes(actorId)) proposal.approvals.push(actorId);
  if (proposal.approvals.length === 2) { finishShared(state,true); resumePlayback(state,now); }
}
export function replayLifetime(state: DuoState) {
  const old = state.lifetime!, archives = Object.fromEntries(Object.entries(old.players).map(([id,p]) => [id,[...p.archives,p.life].slice(-1)]));
  initializeLifetime(state,old.gentler);
  for (const [id,p] of Object.entries(state.lifetime!.players)) p.archives = archives[id] ?? [];
}
