import assert from 'node:assert/strict';
import test from 'node:test';
import { addReflection, advanceYear, createLife, DEFAULT_SETTINGS } from '../src/game/engine';
import { decodeSave, encodeSave } from '../src/game/storage';
import { makeChoice, setFocus } from '../src/game/engine';
import { getCountries } from '../src/game/countries';

test('save preserves deterministic progress and keeps plain user text inert', () => {
  let life = createLife({ ...DEFAULT_SETTINGS, country: 'JPN' }, 124);
  while (life.age < 5) { if (life.pendingDecision) life = makeChoice(life, life.pendingDecision.choices[0].id); life = advanceYear(life); }
  life = addReflection(life, '<img src=x onerror=alert(1)>');
  const decoded = decodeSave(encodeSave(life, []));
  assert.deepEqual(decoded.life, life);
  assert.deepEqual(advanceYear(decoded.life!), advanceYear(life));
  assert.equal(decoded.life!.reflections['5'], '<img src=x onerror=alert(1)>');
});

test('invalid, prototype-bearing, oversized or unsupported imports are rejected', () => {
  for (const text of ['', '[]', '{}', 'null', '{broken', 'x'.repeat(2_000_001), '{"version":999,"life":null,"past":[]}']) assert.throws(() => decodeSave(text));
  const valid = JSON.parse(encodeSave(createLife(DEFAULT_SETTINGS, 22), []));
  for (const change of [
    (s: any) => s.life.age = -1,
    (s: any) => s.life.stats.health = 'healthy',
    (s: any) => s.life.rng = 1.2,
    (s: any) => s.life.country.id = 'NOPE',
    (s: any) => s.life.stats.savings = -100,
    (s: any) => s.life.family.parents = null,
    (s: any) => s.life.events[0].key = '<script>',
    (s: any) => s.life.companions[0].health = null,
    (s: any) => s.life.pendingDecision = { id: 'fake', choices: [] },
    (s: any) => s.life.reflections['5'] = 'a'.repeat(2001),
    (s: any) => s.life.history.push({ age: 9 }),
    (s: any) => s.life.settings.weightMode = 'hacked',
  ]) {
    const bad = structuredClone(valid); change(bad);
    assert.throws(() => decodeSave(JSON.stringify(bad)));
  }
  assert.throws(() => decodeSave(JSON.stringify(valid).replace('"reflections":{}', '"reflections":{"__proto__":{}}')));
});

test('archive is bounded and allows an empty current life after an ending', () => {
  const life = createLife(DEFAULT_SETTINGS, 40);
  const decoded = decodeSave(encodeSave(life, Array.from({ length: 40 }, () => life)));
  assert.equal(decoded.past.length, 40);
  assert.deepEqual(decodeSave('{"version":1,"life":null,"past":[]}'), { life: null, past: [] });
});

test('every country can complete a life with resumable saves at every decision and ending', () => {
  for (const [index, country] of getCountries().entries()) {
    let life = createLife({ ...DEFAULT_SETTINGS, country: country.id }, index + 400);
    for (let step = 0; step < 1000 && life.alive; step++) {
      const before = `${life.age}:${life.pendingDecision?.id ?? ""}`;
      if (life.pendingDecision) {
        life = decodeSave(encodeSave(life, [])).life!;
        life = life.pendingDecision!.type === 'reflection' ? addReflection(life, '') : makeChoice(life, life.pendingDecision!.choices[0].id);
      }
      life = advanceYear(life);
      assert.ok(!life.alive || `${life.age}:${life.pendingDecision?.id ?? ""}` !== before,
        `${country.id}: life must advance or resolve to a different decision`);
    }
    assert.equal(life.alive, false, country.id);
    assert.deepEqual(decodeSave(encodeSave(life, [])).life, life, country.id);
  }
});

test('repeated valid focus changes remain saveable and oversized life IDs are rejected', () => {
  let life = createLife({...DEFAULT_SETTINGS,country:'JPN',autoChoices:true}, 42);
  while(life.age<10&&life.alive)life=advanceYear(life);
  for(let i=0;i<2100;i++) life=setFocus(life,i%2?'health':'knowledge');
  assert.equal(life.events.length,1500);
  assert.doesNotThrow(()=>decodeSave(encodeSave(life,[])));
  life.id='x'.repeat(200);
  assert.throws(()=>decodeSave(JSON.stringify({version:1,life,past:[]})));
});

test('twenty long completed lives fit the archive and imported event IDs cannot break uniqueness', () => {
  let life=createLife({...DEFAULT_SETTINGS,country:'JPN',autoChoices:true},33);
  while(life.age<10&&life.alive)life=advanceYear(life);
  for(let i=0;i<1550;i++)life=setFocus(life,i%2?'health':'knowledge');
  while(life.alive) life=advanceYear(life);
  assert.doesNotThrow(()=>decodeSave(encodeSave(life,Array.from({length:20},()=>life))));
  let imported=createLife(DEFAULT_SETTINGS,2);imported.events[0].id='user-event';
  imported=decodeSave(encodeSave(imported,[])).life!;
  imported=setFocus(imported,'health');imported=setFocus(imported,'career');
  assert.equal(new Set(imported.events.map(e=>e.id)).size,imported.events.length);
});

test('legacy saves acquire safe mechanics defaults without rerolling identity or RNG', () => {
  const birth = createLife({...DEFAULT_SETTINGS,country:'JPN'},424);
  const legacy: any = JSON.parse(encodeSave(birth,[]));
  for(const key of ['mechanicsVersion','temperament','talents','hobbies','schooling','budget','belongings','residence','jobOffers']) delete legacy.life[key];
  delete legacy.life.stats.debt; delete legacy.life.family.married; delete legacy.life.family.marriageAge;
  const restored = decodeSave(JSON.stringify(legacy)).life!;
  assert.equal(restored.mechanicsVersion,7);
  assert.equal(restored.rng,birth.rng);
  assert.equal(restored.name,birth.name);
  assert.equal(restored.stats.debt,0);
  assert.equal(restored.healthcare.lastCheckedAge,-1); // Legacy newborn has not been screened.
  assert.deepEqual(advanceYear(restored),advanceYear(decodeSave(JSON.stringify(legacy)).life!));
});

test('new mechanics reject forged skills, future choices, contradictory budgets and belongings', () => {
  const save = JSON.parse(encodeSave(createLife(DEFAULT_SETTINGS,22),[]));
  for(const change of [
    (s:any)=>s.life.temperament.kind='omniscient',
    (s:any)=>s.life.hobbies=[{id:'reading',skill:101,trainedAt:0}],
    (s:any)=>s.life.hobbies=Array.from({length:4},()=>({id:'reading',skill:5,trainedAt:-1})),
    (s:any)=>s.life.belongings.transport='spaceship',
    (s:any)=>s.life.belongings.housingValue=10000,
    (s:any)=>s.life.stats.debt=-100,
    (s:any)=>s.life.budget.annualSavings=5000,
    (s:any)=>s.life.schooling.years=50,
    (s:any)=>s.life.decisions=['hobby'],
    (s:any)=>s.life.jobOffers=[{id:'offer0',job:'engineer',income:-1}],
  ]) { const bad=structuredClone(save);change(bad);assert.throws(()=>decodeSave(JSON.stringify(bad))); }
});

test('version-two layouts migrate without rerolling, and adult state rejects contradictions', () => {
  const birth=createLife({...DEFAULT_SETTINGS,country:'JPN'},414);
  const old:any=JSON.parse(encodeSave(birth,[]));old.life.mechanicsVersion=2;
  for(const key of ['training','justice','relationship','care','opportunities'])delete old.life[key];
  const migrated=decodeSave(JSON.stringify(old)).life!;
  assert.equal(migrated.mechanicsVersion,7);assert.equal(migrated.rng,birth.rng);assert.equal(migrated.name,birth.name);
  assert.equal(migrated.healthcare.lastCheckedAge,-1);
  assert.deepEqual(advanceYear(migrated),advanceYear(decodeSave(JSON.stringify(old)).life!));
  const saved=JSON.parse(encodeSave(birth,[]));
  for(const change of [
    (s:any)=>s.life.training={kind:'mechanic',endsAt:null,previousIncome:0,previousJob:'none'},
    (s:any)=>s.life.justice.prisonUntil=-1,
    (s:any)=>s.life.relationship.status='married',
    (s:any)=>s.life.care.handledChildren=['unknown-child'],
    (s:any)=>s.life.opportunities.lastRiskAge=30,
    (s:any)=>s.life.relationship.partnerIncome=-100,
  ]){const bad=structuredClone(saved);change(bad);assert.throws(()=>decodeSave(JSON.stringify(bad)));}
});
