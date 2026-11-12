import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, advanceYear, DEFAULT_SETTINGS } from '../src/game/engine';
import { decodeSave, encodeSave } from '../src/game/storage';
import { planArchiveRemoval } from '../src/lib/archive-management';

function ended(seed: number) {
  let life = createLife({ ...DEFAULT_SETTINGS, country: 'JPN', autoChoices: true }, seed);
  while (life.alive) life = advanceYear(life);
  return life;
}

test('removing one archive preserves the active life and every unselected record', () => {
  const active = createLife(DEFAULT_SETTINGS, 501), first = ended(502), second = ended(503);
  const past = [first, second], before = JSON.stringify({life: active, past});
  const result = planArchiveRemoval(active, past, [first.id, 'unknown-id', first.id]);
  assert.equal(result.life, active);
  assert.deepEqual(result.past.map(record => record.id), [second.id]);
  assert.deepEqual(result.metadata, [['1in8bn-save-v1', null], [`1in8bn-room-${first.id}`, null], [`1in8bn-film-${first.id}`, null], [`1in8bn-choices-${first.id}`, null]]);
  assert.equal(JSON.stringify({life: active, past}), before);
});

test('removing the current ending clears its pointer so decoding cannot resurrect it', () => {
  const first = ended(504), second = ended(505);
  const result = planArchiveRemoval(first, [first, second], [first.id]);
  assert.equal(result.life, null);
  assert.deepEqual(decodeSave(encodeSave(result.life, result.past)), {life: null, past: [second]});
});

test('clear-all preserves ongoing life metadata and leaves public memorial management credentials outside the deletion plan', () => {
  const active = createLife(DEFAULT_SETTINGS, 506), past = [active, ended(507)];
  const result = planArchiveRemoval(active, past, past.map(l => l.id));
  assert.deepEqual(result.past, []); assert.equal(result.life, active);
  assert.ok(result.metadata.length > 0);
  assert.ok(result.metadata.every(([key]) => !key.endsWith(active.id) && !key.includes('owner-')));
  assert.deepEqual(planArchiveRemoval(active, past, ['not-in-archive']), {life: active, past, metadata: []});
});
