import type { Life } from './types';

/** Fast-forward is real-time acceleration, with the same bounded frame as normal play. */
export function playbackElapsed(milliseconds: number, duration: number, speed: number, fastForward: boolean): number {
  return Math.max(0, Math.min(milliseconds, 250)) * speed * (fastForward ? 24 : 1) / (duration * 60000 / 80);
}

export function stopsFastForward(before: Life, after: Life): boolean {
  if (before.id !== after.id || !after.alive || after.pendingDecision) return true;
  // Engine auto choices can resolve within the same tick, leaving no pending modal.
  if (after.decisions.length > before.decisions.length || Object.keys(after.reflections).length > Object.keys(before.reflections).length) return true;
  const closeFamily = (life: Life) => [...life.family.parents, ...life.family.children, ...(life.family.partner ? [life.family.partner] : [])];
  const relatives = new Map(closeFamily(after).map(person => [person.id, person]));
  if (closeFamily(before).some(person => person.alive && relatives.get(person.id)?.alive === false)) return true;
  if (before.stats.employment === 'employed' && after.stats.employment === 'unemployed') return true;
  return after.conditions.some(condition => !before.conditions.includes(condition));
}

/** The toolbar and engine share this persisted setting, including imported lives. */
export function setAutomaticChoices(life: Life, enabled: boolean): Life {
  return life.settings.autoChoices === enabled ? life : { ...life, settings: { ...life.settings, autoChoices: enabled } };
}

export function setPlayback(life: Life, patch: Partial<{ paused: boolean; speed: number }>): Life {
  const playback = { paused: false, speed: 1, ...life.playback, ...patch };
  if (typeof playback.paused !== 'boolean' || ![1, 2, 4, 8, 12, 16].includes(playback.speed))
    throw new RangeError('Invalid playback controls');
  if (life.playback?.paused === playback.paused && life.playback.speed === playback.speed) return life;
  return { ...life, playback };
}
