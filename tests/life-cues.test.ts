import test from 'node:test';
import assert from 'node:assert/strict';
import { calmMusic, lifeCueFor } from '../src/lib/calm-music';

test('turning points map to musical cues; everyday events stay quiet', () => {
  assert.equal(lifeCueFor('event.marriage'), 'wedding');
  assert.equal(lifeCueFor('event.descendantWedding'), 'wedding');
  assert.equal(lifeCueFor('event.child'), 'birth');
  assert.equal(lifeCueFor('event.descendantBirth'), 'birth');
  assert.equal(lifeCueFor('event.retirement'), 'milestone');
  assert.equal(lifeCueFor('event.familyDeath'), 'loss');
  for (const key of ['event.promotion', 'event.familyTime', 'event.descendantStories', 'event.decision']) assert.equal(lifeCueFor(key), null);
});

test('a cue never starts audio when the player has music off', () => {
  assert.equal(calmMusic.isPlaying(), false);
  assert.doesNotThrow(() => calmMusic.cue('wedding'));
  assert.equal(calmMusic.isPlaying(), false);
});
