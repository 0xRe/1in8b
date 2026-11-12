import { lifeTable } from './engine';
import type { Companion, Job, Life } from './types';
export interface CompanionLifetime extends Companion { projected: boolean; observedUntil: number; lastJob: Job | null }
function random(state: { rng: number }) {
  state.rng = (state.rng + 0x6d2b79f5) >>> 0;
  let value = state.rng; value = Math.imul(value ^ value >>> 15, value | 1);
  value ^= value + Math.imul(value ^ value >>> 7, value | 61);
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
}
const bounded = (value: number) => Math.max(0, Math.min(100, value));
function cause(life: Life, companion: Companion, state: { rng: number }) {
  if (life.settings.gentler || life.settings.classroom) return 'cause.peaceful';
  if (companion.age < 5) return 'cause.infant';
  if (companion.age > 85) return 'cause.age';
  const weights: [string, number][] = companion.age < 40
    ? [['cause.accident', 20 + companion.country.road], ['cause.infection', 8 + companion.country.mal * 20 + companion.country.hiv * 4], ['cause.conflict', companion.country.war * 10], ['cause.illness', 15]]
    : [['cause.heart', 40], ['cause.cancer', 28], ['cause.infection', 5 + companion.country.mal * 10], ['cause.accident', companion.country.road / 2], ['cause.illness', 15]];
  let draw = random(state) * weights.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [key, weight] of weights) { draw -= weight; if (draw < 0) return key; }
  return 'cause.illness';
}
/** Completes a fictional continuation from the observed checkpoint, on separate RNG streams.
 * The projection is derived rather than saved; it cannot advance or reroll the player's life. */
export function companionLifetimes(life: Life): CompanionLifetime[] {
  return life.companions.map((original, index) => {
    const c: CompanionLifetime = { ...structuredClone(original), projected: original.alive, observedUntil: original.age,
      lastJob: original.lastJob ?? (['none', 'student', 'retired'].includes(original.job) ? null : original.job) };
    const state = { rng: (life.seed ^ Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(original.age + 1, 0x85ebca6b)) >>> 0 };
    const hazards = lifeTable(c.country, c.sex).q;
    const job = (): Job => c.education >= 4 ? (['teacher', 'nurse', 'engineer'] as const)[Math.floor(random(state) * 3)] : c.education === 3 ? 'artisan' : random(state) < c.country.agr / 100 ? 'farmer' : 'service';
    while (c.alive) {
      const factor = (life.era === 'past' ? 1.28 : life.era === 'future' ? .78 : 1) * (c.age < 5 ? 1 : Math.max(.75, Math.min(2.4, 1 + (80 - c.health) * .012)));
      if (c.age >= 110 || random(state) < 1 - (1 - hazards[c.age]) ** factor) {
        c.alive = false; c.deathAge = c.age; c.cause = cause(life, c, state); break;
      }
      c.age++;
      c.health = bounded(c.health + (random(state) - .5) * 5 - (c.age > 50 ? .6 : 0));
      c.happiness = bounded(c.happiness + (random(state) - .5) * 6);
      if (c.age === 6) { c.education = 1; c.job = 'student'; }
      if (c.age === 12) c.education = 2;
      if (c.age === 18) { c.education = random(state) * 100 < c.country.ter ? 4 : random(state) < .4 ? 3 : 2; c.job = c.education === 4 ? 'student' : job(); }
      if (c.age === 22 && c.job === 'student') c.job = job();
      if (c.age > 22 && c.age < 45 && random(state) < c.country.tfr / 27 && c.children < 6) c.children++;
      if (!['none', 'student', 'retired'].includes(c.job)) c.lastJob = c.job;
      if (c.age === 65) c.job = 'retired';
      if (c.age >= 18 && c.job !== 'student') c.netAssets = Math.round(Math.max(0, Math.min(1e12, c.netAssets * (1 + (random(state) - .4) * .06) + c.country.ppp * (c.education >= 4 ? .14 : .06) * (life.era === 'past' ? .65 : life.era === 'future' ? 1.35 : 1))) * 100) / 100;
    }
    return c;
  });
}
