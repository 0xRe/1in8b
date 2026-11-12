import assert from 'node:assert/strict';
import test from 'node:test';
import { createLife, setFocus } from '../src/game/engine';
import { addChildProgress, familyMembers, MAX_RELATIVES } from '../src/game/descendants';
import { encodeSave, decodeSave } from '../src/game/storage';
import type { Person } from '../src/game/types';

test('a complete family with two player partners preserves all 92 living relatives through backup', () => {
  const life = createLife(undefined, 9031);
  life.age = 70;
  life.healthcare.lastCheckedAge = 70;
  life.year = life.birthYear + 70;
  life.descendants.lastYear = life.year;
  life.history = Array.from({length: 71}, (_, age) => ({...structuredClone(life.history[0]), age, annual: null}));
  const person = (id: string, age: number): Person => ({
    id, name: id, sex: 'F', country: life.country.id, age,
    birthYear: life.year - age, alive: true, deathAge: null, job: 'service',
  });
  // Parents had the player at 20; the player had eight children at 30;
  // each child had four children at 20. All spouses are adults.
  life.family.parents = [person('parent-a', 90), person('parent-b', 90)];
  life.family.siblings = Array.from({length: 8}, (_, i) => person(`sibling-${i}`, 65));
  life.family.partner = person('partner-a', 70);
  life.family.secondPartner = person('partner-b', 70);
  life.family.married = true;
  life.family.marriageAge = 28;
  life.relationship.status = 'married';
  life.family.children = Array.from({length: 8}, (_, i) => person(`child-${i}`, 40));
  for (const child of life.family.children) {
    const progress = addChildProgress(life, child);
    progress.spouse = person(`${child.id}-spouse`, 40);
    progress.marriedYear = child.birthYear + 18;
    progress.weddingResolved = true;
    for (let i = 0; i < 4; i++) {
      const grandchild = person(`${child.id}-grandchild-${i}`, 20);
      life.descendants.grandchildren.push({
        ...structuredClone(progress), ...grandchild,
        childId: grandchild.id, parentId: child.id,
        spouse: person(`${grandchild.id}-spouse`, 20),
        marriedYear: grandchild.birthYear + 18,
      });
    }
  }
  assert.equal(familyMembers(life).length, 92);
  assert.equal(familyMembers(life).filter(p => p.alive).length, 92);
  const recorded = setFocus(life, 'health');
  assert.equal(recorded.history.at(-1)!.annual!.relativesAlive, 92);
  assert.deepEqual(decodeSave(encodeSave(recorded, [])).life, recorded);
  const impossible = structuredClone(recorded);
  impossible.history.at(-1)!.annual!.relativesAlive = MAX_RELATIVES + 1;
  assert.throws(() => decodeSave(JSON.stringify({version: 1, life: impossible, past: []})));
});
