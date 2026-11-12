import type { GameEvent, Life } from '../game/types';
import { SCENE_KINDS, sceneKind, type SceneKind } from './pixel-art';
import { lifeGrain } from './life-insights';

/**
 * A finished life, reduced to what its link preview and invitation need: the portrait seed,
 * the age reached, one scene from the life and its grain. No choices, notes or reflections.
 */
export type LifeShareCode = { seed: number; age: number; birthYear: number; sex: 'M' | 'F'; kind: SceneKind; sceneAge: number; grain: number | null };

const int = (value: string, min: number, max: number) => /^\d{1,10}$/.test(value) && Number(value) >= min && Number(value) <= max ? Number(value) : null;

export function encodeLifeCode(code: LifeShareCode): string {
  return [(code.seed >>> 0).toString(36), code.age, code.birthYear, code.sex, SCENE_KINDS.indexOf(code.kind), code.sceneAge, code.grain ?? 'x'].join('-');
}

export function decodeLifeCode(value: string | null | undefined): LifeShareCode | null {
  if (!value || value.length > 48) return null;
  const parts = value.split('-');
  if (parts.length !== 7 || !/^[0-9a-z]{1,7}$/.test(parts[0])) return null;
  const seed = parseInt(parts[0], 36), age = int(parts[1], 0, 125), birthYear = int(parts[2], 1800, 2400);
  const kind = SCENE_KINDS[int(parts[4], 0, SCENE_KINDS.length - 1) ?? -1], sceneAge = int(parts[5], 0, 125);
  const grain = parts[6] === 'x' ? null : int(parts[6], 0, 63);
  if (!Number.isSafeInteger(seed) || seed > 4294967295 || age === null || birthYear === null || !kind || sceneAge === null || sceneAge > age) return null;
  if ((parts[1] !== String(age)) || (parts[3] !== 'M' && parts[3] !== 'F') || (parts[6] !== 'x' && grain === null)) return null;
  return { seed, age, birthYear, sex: parts[3], kind, sceneAge, grain };
}

/** Names travel in the link so the invitation can greet by name; keep them short and inert. */
export function cleanShareName(value: string | null | undefined): string {
  return (value ?? '').replace(/[\u0000-\u001f\u007f<>"`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 48);
}

/** The scene that stands for the life: its happiest remembered year, not the grave. */
export function signatureEvent(life: Life): GameEvent | undefined {
  const remembered = life.events.filter(e => !['everyday', 'finance', 'reflection'].includes(e.kind) && e.key !== 'event.choice' && !/death|funeral|goodbye/.test(e.key));
  if (!remembered.length) return undefined;
  const happiness = new Map(life.history.map(h => [h.age, h.happiness]));
  return remembered.reduce((best, e) => (happiness.get(e.age) ?? 0) > (happiness.get(best.age) ?? 0) ? e : best, remembered[remembered.length - 1]);
}

export function lifeShareCode(life: Life): LifeShareCode {
  // A newborn is shown as a baby in the nursery; there is no lived life to summarize yet.
  if (life.alive && life.age === 0) return { seed: life.seed >>> 0, age: 0, birthYear: life.birthYear, sex: life.sex, kind: 'nursery', sceneAge: 0, grain: null };
  const event = signatureEvent(life), grain = lifeGrain(life);
  return {
    seed: life.seed >>> 0, age: life.age, birthYear: life.birthYear, sex: life.sex,
    kind: event ? sceneKind(life, event) : 'park', sceneAge: Math.min(life.age, event?.age ?? life.age),
    grain: grain.insufficient || grain.mixed ? null : grain.index,
  };
}

/** Adds the public life preview to an invitation URL. */
export function lifeShareUrl(base: string, life: Life | null): string {
  const url = new URL(base);
  if (life && (!life.alive || life.age === 0)) {
    url.searchParams.set('life', encodeLifeCode(lifeShareCode(life)));
    const name = cleanShareName(life.name);
    if (name) url.searchParams.set('n', name);
  }
  return url.href;
}

export function readLifeInvitation(search: string) {
  const params = new URLSearchParams(search), code = decodeLifeCode(params.get('life'));
  return code ? { code, name: cleanShareName(params.get('n')) } : null;
}

/** The friend whose life link brought this player, kept on this device for 30 days. */
export type Inviter = { code: string; name: string; country: string; at: number };
const INVITER_KEY = '1in8bn-invited-by';
export function rememberInviter(code: LifeShareCode, name: string, country: string, now = Date.now()) {
  try { localStorage.setItem(INVITER_KEY, JSON.stringify({ code: encodeLifeCode(code), name: cleanShareName(name), country: country.slice(0, 8), at: now })); } catch { /* Storage may be unavailable; the comparison is optional. */ }
}
export function readInviter(now = Date.now()): Inviter | null {
  try {
    const value = JSON.parse(localStorage.getItem(INVITER_KEY) ?? 'null') as Partial<Inviter> | null;
    if (!value || typeof value.code !== 'string' || !decodeLifeCode(value.code) || typeof value.at !== 'number' || now - value.at > 30 * 864e5 || value.at > now) return null;
    return { code: value.code, name: cleanShareName(value.name), country: typeof value.country === 'string' ? value.country : '', at: value.at };
  } catch { return null; }
}
