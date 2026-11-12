import type { Life } from '../game/types';
/** Plan deletion of local lives and their saved memories. */
export function planArchiveRemoval(life: Life | null, past: Life[], ids: readonly string[]): {life: Life | null; past: Life[]; metadata: [string, null][]} {
  const requested = new Set(ids);
  const removed = new Set(past.filter(record => requested.has(record.id)).map(record => record.id));
  const nextLife = life && !life.alive && removed.has(life.id) ? null : life;
  const metadata: [string, null][] = [];
  // Old installs can still fall back to this cache if their current DB entry is lost.
  if (removed.size) metadata.push(['1in8bn-save-v1', null]);
  for (const id of removed) {
    if (nextLife?.id === id) continue;
    metadata.push([`1in8bn-room-${id}`, null], [`1in8bn-film-${id}`, null], [`1in8bn-choices-${id}`, null]);
  }
  return {life: nextLife, past: past.filter(record => !removed.has(record.id)), metadata};
}
