import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, DEFAULT_SETTINGS, advanceYear, advanceTimeline, availableFocuses, makeChoice, addReflection } from '../src/game/engine';
import { decodeSave, encodeSave } from '../src/game/storage';

test('infant years expose no focus and record no focus time or focus bonuses', () => {
  const birth = createLife({ ...DEFAULT_SETTINGS, country: 'JPN', gentler: true }, 1);
  assert.deepEqual(availableFocuses(birth), []);
  const started = advanceYear(birth, .01);
  assert.deepEqual(started.timeline!.focusTime, {});
  // Remove ordinary stories and finance so this checks focus effects specifically.
  started.timeline!.queue = []; started.timeline!.financePending = false;
  started.feed!.plan!.queue = [];
  const before = structuredClone(started.stats);
  const done = advanceTimeline(started, 1);
  assert.deepEqual(done.stats, before);
  assert.deepEqual(done.history.at(-1)!.annual!.focusWeights, {});
  assert.deepEqual(decodeSave(encodeSave(done, [])).life, done);
});

test('legacy infant focus time cannot award a deferred bonus after import', () => {
  const started = advanceYear(createLife({ ...DEFAULT_SETTINGS, country: 'JPN', gentler: true }, 1), .01);
  started.timeline!.focusTime = { balanced: .5 };
  started.timeline!.queue = []; started.timeline!.financePending = false;
  started.feed!.plan!.queue = [];
  const restored = decodeSave(encodeSave(started, [])).life!;
  const before = structuredClone(restored.stats);
  const done = advanceTimeline(restored, 1);
  assert.deepEqual(done.stats, before);
  assert.deepEqual(done.timeline!.focusTime, {});
  assert.deepEqual(started.timeline!.focusTime, { balanced: .5 }, 'input is unchanged');
});

test('focus accrual starts at six', () => {
  let life = createLife({ ...DEFAULT_SETTINGS, country: 'JPN', gentler: true }, 1);
  for (let i = 0; life.age < 6 && i < 40; i++) {
    if (life.pendingDecision) life = life.pendingDecision.type === 'reflection' ? addReflection(life, '') : makeChoice(life, life.pendingDecision.choices[0].id);
    life = advanceYear(life);
  }
  assert.equal(life.age, 6);
  assert.ok(Object.values(life.timeline!.focusTime!).some(time => time > 0));
});
