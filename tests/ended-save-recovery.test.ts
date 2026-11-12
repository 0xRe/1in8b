import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, DEFAULT_SETTINGS, advanceYear } from '../src/game/engine';
import { decodeSave, encodeSave, MAX_PAST_LIVES } from '../src/game/storage';
import { importBackup } from '../src/lib/transfer';

function endedLife() {
  let life = createLife({ ...DEFAULT_SETTINGS, country: 'JPN', autoChoices: true, gentler: true }, 1);
  for (let step = 0; life.alive && step < 500; step++) life = advanceYear(life);
  assert.equal(life.alive, false);
  return life;
}
const ended = endedLife();

test('an ended current life is reachable in the archive after backup import and reload', () => {
  const raw = encodeSave(ended, []);
  const imported = importBackup(raw);
  assert.equal(imported.past.length, 1);
  assert.deepEqual(imported.past[0], imported.life);
  const restored = decodeSave(encodeSave(imported.life, imported.past));
  assert.deepEqual(restored.past, imported.past);
  assert.deepEqual(decodeSave(raw).past, imported.past, 'direct local recovery uses the same archive normalization');
});

test('recovery keeps an existing ending once and bounds a missing ending in a full archive', () => {
  assert.equal(decodeSave(encodeSave(ended, [ended])).past.length, 1);
  const past = Array.from({ length: MAX_PAST_LIVES }, (_, i) => ({ ...createLife(DEFAULT_SETTINGS, i + 10), id: `archived-${i}` }));
  const restored = decodeSave(encodeSave(ended, past));
  assert.equal(restored.past.length, MAX_PAST_LIVES);
  assert.equal(restored.past[0].id, ended.id);
  assert.equal(restored.past[1].id, 'archived-0');
  assert.equal(restored.past.at(-1)!.id, `archived-${MAX_PAST_LIVES - 2}`);
});

test('an unfinished current life stays out of the archive during recovery', () => {
  const life = createLife(DEFAULT_SETTINGS, 2);
  const restored = decodeSave(encodeSave(life, [ended]));
  assert.deepEqual(restored.past, [ended]);
});
