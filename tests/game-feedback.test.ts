import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, DEFAULT_SETTINGS, advanceYear, makeChoice } from '../src/game/engine';
import { chapterCrossed, CHILDHOOD_TEMPO, describeConsequence, openingTempo, OPENING_TEMPO } from '../src/lib/game-feedback';

test('quiet years before school pass faster; decisions, fast-forward and later ages are unchanged', () => {
  assert.equal(openingTempo({ age: 0, pendingDecision: null }), OPENING_TEMPO);
  assert.equal(openingTempo({ age: 5, pendingDecision: null }), OPENING_TEMPO);
  assert.equal(openingTempo({ age: 6, pendingDecision: null }), 1);
  assert.equal(openingTempo({ age: 7, pendingDecision: null }), CHILDHOOD_TEMPO);
  assert.equal(openingTempo({ age: 11, pendingDecision: null }), CHILDHOOD_TEMPO);
  assert.equal(openingTempo({ age: 12, pendingDecision: null }), 1);
  assert.equal(openingTempo({ age: 9, pendingDecision: null }, true), 1);
  assert.equal(openingTempo({ age: 40, pendingDecision: null }), 1);
  assert.equal(openingTempo({ age: 3, pendingDecision: null }, true), 1);
  assert.equal(openingTempo({ age: 2, pendingDecision: { id: 'd', type: 'choice', age: 2, key: 'decision.temperament', params: {}, choices: [] } }), 1);
});

test('chapters are announced once when an age boundary is crossed', () => {
  assert.equal(chapterCrossed(5, 5), null);
  assert.equal(chapterCrossed(0, 3), null);
  assert.deepEqual(chapterCrossed(5, 6), { number: 2, key: 'feel.chapter.school', age: 6 });
  assert.deepEqual(chapterCrossed(64, 66), { number: 7, key: 'feel.chapter.later', age: 65 });
  assert.equal(chapterCrossed(6, 5), null);
});

test('decision consequences report the stats, job and money a choice changed', () => {
  let life = createLife({ ...DEFAULT_SETTINGS, autoChoices: false }, 4);
  for (let i = 0; i < 400 && life.alive && !life.pendingDecision; i++) life = advanceYear(life);
  assert.ok(life.pendingDecision, 'a decision appears early in life');
  const choice = life.pendingDecision!.choices[0];
  const after = makeChoice(life, choice.id);
  const result = describeConsequence(life, after, choice);
  assert.equal(result.choiceKey, choice.key);
  for (const s of result.stats) assert.equal(s.delta, Math.round(after.stats[s.key] - life.stats[s.key]));
  assert.equal(result.savings, Math.round(after.stats.savings - life.stats.savings));
});
