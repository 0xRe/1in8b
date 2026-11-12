import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, DEFAULT_SETTINGS, advanceYear, makeChoice, addReflection } from '../src/game/engine';
import { EN } from '../src/lib/i18n';

test('every decision, choice and event key the engine emits has English text', () => {
  const missing = new Set<string>();
  const check = (key: string) => { if (!(key in EN)) missing.add(key); };
  for (let seed = 1; seed <= 80; seed++) {
    let life = createLife({ ...DEFAULT_SETTINGS, autoChoices: false }, seed);
    for (let step = 0; step < 2500 && life.alive; step++) {
      const d = life.pendingDecision;
      if (!d) { life = advanceYear(life); continue; }
      check(d.key); d.choices.forEach((c) => check(c.key));
      life = d.type === 'reflection' ? addReflection(life, '') : makeChoice(life, d.choices[(seed + step) % d.choices.length].id);
    }
    life.events.forEach((e) => check(e.key));
  }
  assert.deepEqual([...missing], []);
});
