import test from 'node:test';
import assert from 'node:assert/strict';
import { createLife, DEFAULT_SETTINGS } from '../src/game/engine';
import {
  epilogueStory,
  endingSummary,
  generateBiography,
  causeMortalityContext,
  whoSaidGoodbye,
  lookingBackReflection,
  fiveCompanions,
  globalImpactCauses,
  todayThemeFact,
} from '../src/lib/ending-story';
import { translator } from '../src/lib/i18n';

test('epilogue is deterministic and stays within the lived years', () => {
  const l = createLife(DEFAULT_SETTINGS, 42);
  l.age = 80;
  const a = epilogueStory(l);
  assert.deepEqual(a, epilogueStory(l));
  assert.ok(a.age <= 80);
  assert.ok(a.lines.length >= 3);
  const child = { ...l, age: 2 };
  assert.equal(epilogueStory(child).scene, 'nursery');
  assert.ok(epilogueStory(child).age <= 2);
  assert.ok(!epilogueStory(child).lines.join().includes('work'));
});

test('ending summary reflects actual family and keeps reflection text separate from public scenes', () => {
  const l = createLife(DEFAULT_SETTINGS, 52);
  l.age = 40;
  l.reflections = { '20': 'a private thought' };
  const summary = endingSummary(l);
  assert.equal(summary.days, 14610);
  assert.equal(summary.reflection, 'a private thought');
  assert.ok(!epilogueStory(l).lines.join().includes('a private thought'));
});

test('biography and mortality context generate rich biographical summaries without empty placeholders', () => {
  const t = translator('en');
  const life = createLife({ ...DEFAULT_SETTINGS, country: 'UGA' }, 101);
  life.age = 57;
  life.stats.education = 1;
  life.family.married = true;
  life.family.partner = { id: 'p1', name: 'Lucy', sex: 'F', age: 56, alive: true, birthYear: 2027, deathAge: null };
  life.family.children = [
    { id: 'c1', name: 'Joseph', sex: 'M', age: 30, alive: true, birthYear: 2053, deathAge: null },
    { id: 'c2', name: 'Grace', sex: 'F', age: 28, alive: false, birthYear: 2055, deathAge: 20 },
  ];
  life.talents = ['art'];
  life.cause = 'cause.heart';

  const bio = generateBiography(life, 'en', t);
  assert.ok(bio.includes('Uganda'), 'Contains country');
  assert.ok(bio.includes('Finished'), 'Contains education');
  assert.ok(bio.includes('Raised 2 children'), 'Contains children count');
  assert.ok(bio.includes('died before you'), 'Mentions deceased children');

  const context = causeMortalityContext(life, 'en', t);
  assert.ok(context.percent >= 5 && context.percent <= 50);
  assert.ok(context.contextText.includes('Uganda'));
  assert.ok(context.contextText.includes('50–69'));

  const goodbye = whoSaidGoodbye(life, 'en', t);
  assert.ok(goodbye.includes('Lucy'));
  assert.ok(goodbye.includes('1 child,'), goodbye);

  const reflection = lookingBackReflection(life, 'en', t);
  assert.ok(reflection.length > 0);

  const companions = fiveCompanions(life, 'en', t);
  assert.equal(companions.companions.length, 5);
  // Shortest life first
  for (let i = 0; i < companions.companions.length - 1; i++) {
    assert.ok(companions.companions[i].age <= companions.companions[i + 1].age);
  }
  assert.ok(companions.closingText.includes('The five people born in the same second lived to'));

  const causes = globalImpactCauses(life, 'en', t);
  assert.equal(causes.length, 3);
  assert.ok(causes.some(c => c.id === 'hunger'));
  assert.ok(causes.some(c => c.id === 'malaria'));
  assert.ok(causes.some(c => c.id === 'vaccines'));

  const theme = todayThemeFact(life, 'en', t);
  assert.ok(theme.statText.includes('WHO'));
});

test('goodbye includes all surviving partners even without children, and excludes deceased partners',()=>{
 const life=createLife(DEFAULT_SETTINGS,123);const t=translator('en');
 life.family.partner={id:'p1',name:'First Survivor',sex:'F',age:30,birthYear:life.year-30,alive:true,deathAge:null,job:'service'};
 life.family.secondPartner={...life.family.partner,id:'p2',name:'Second Survivor'};
 const both=whoSaidGoodbye(life,'en',t);
 assert.ok(both.includes('First Survivor'));assert.ok(both.includes('Second Survivor'));
 life.family.partner.alive=false;life.family.partner.deathAge=30;
 const one=whoSaidGoodbye(life,'en',t);
 assert.ok(!one.includes('First Survivor'));assert.ok(one.includes('Second Survivor'));
});
test('a previous marriage is not described as never married after separation',()=>{
 const life=createLife(DEFAULT_SETTINGS,123);life.family.marriageAge=0;
 assert.ok(!generateBiography(life,'en',translator('en')).includes('Never married'));
});

test('goodbye retains living grandchildren after their parents have died',()=>{
 const life=createLife(DEFAULT_SETTINGS,123);
 life.descendants.grandchildren=[{alive:true} as any];
 const result=whoSaidGoodbye(life,'en',translator('en'));
 assert.ok(result.includes('1 grandchild,'));
});
test('goodbye leaves out counts of zero in every language',()=>{
 const life=createLife(DEFAULT_SETTINGS,123);
 life.family.children=[{alive:true} as any,{alive:true} as any];
 life.descendants.grandchildren=[];
 const en=whoSaidGoodbye(life,'en',translator('en'));
 assert.ok(en.includes('2 children,')&&!/\b0\b/.test(en),en);
 for (const code of ['ko','ja','zh','zh-hans','vi','fr','th','es','de','tr','ru'] as const) {
  const text=whoSaidGoodbye(life,code,translator(code));
  assert.ok(!/(^|\D)0(\D|$)/.test(text)&&text.includes('2'),`${code}: ${text}`);
 }
});
