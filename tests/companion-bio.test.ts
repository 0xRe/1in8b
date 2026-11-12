import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, DEFAULT_SETTINGS, advanceYear, makeChoice, addReflection } from '../src/game/engine';
import { fiveCompanions } from '../src/lib/ending-story';
import { translator } from '../src/lib/i18n';

test('companion biographies only state facts that apply, with a singular child', () => {
  const t = translator('en');
  let checked = 0;
  for (let seed = 1; seed <= 25; seed++) {
    let life = createLife({ ...DEFAULT_SETTINGS, autoChoices: false }, seed);
    for (let step = 0; step < 2500 && life.alive; step++) {
      const d = life.pendingDecision;
      life = d ? (d.type === 'reflection' ? addReflection(life, '') : makeChoice(life, d.choices[0].id)) : advanceYear(life);
    }
    for (const c of fiveCompanions(life, 'en', t).companions.filter((x) => !x.isPlayer)) {
      checked++;
      assert.doesNotMatch(c.bio, /Finished Not yet in school|Worked as Not recorded|Last job: Not recorded|Raised 0 children|Raised 1 children/);
      if (c.age < 6) assert.doesNotMatch(c.bio, /Finished|Worked as|Last job|Raised/);
    }
  }
  assert.ok(checked > 50);
});
