import assert from "node:assert/strict";
import test from "node:test";
import { naturalFamily, familyChoice, findFamilyCheckpoint } from "./helpers/adult-family-simulation";
import { advanceYear, makeChoice, setFocus } from "../src/game/engine";
import { decodeSave, encodeSave } from "../src/game/storage";
import { familyMembers, MAX_RELATIVES, yearlyDescendants } from "../src/game/descendants";
import type { Life } from "../src/game/types";
const checkpoints = (seed = 124) => [...naturalFamily(seed)];
const reload = (life: Life) => decodeSave(encodeSave(life, [])).life!;

test("naturally grown grandchildren have saved university, wedding, career, household and migration paths", () => {
  const seed=5,lives=checkpoints(seed); // Verified full natural scenario after child travel-practice draws.
  const grandchildren = lives.at(-1)!.descendants.grandchildren;
  assert.ok(
    grandchildren.some((g) => Number(g.income) > 0),
    "grandchild income",
  );
  const choices = new Set<string>();
  for (const life of lives) {
    assert.deepEqual(reload(life), life);
    if (life.descendants.grandchildren.some((g) => life.pendingDecision?.id.endsWith(`-${g.id}`)))
      choices.add(life.pendingDecision!.key);
  }
  assert.deepEqual([...choices].sort(), [
    "decision.descendantMigration",
    "decision.descendantUniversity",
    "decision.descendantWedding",
  ]);
  assert.ok(grandchildren.some((g) => g.spouse));
  assert.ok(grandchildren.some((g) => g.migratedYear !== null && g.lastVisitYear !== null));
  const names = new Set(grandchildren.map((g) => g.name));
  for (const key of [
    "event.descendantJob",
    "event.descendantPromotion",
    "event.descendantJobLoss",
    "event.descendantHome",
    "event.descendantVisit",
  ])
    assert.ok(
      lives.at(-1)!.events.some((e) => e.key === key && names.has(String(e.params.name))),
      key,
    );
  const transitions = new Set<string>();
  for (let i = 1; i < lives.length; i++)
    for (const g of lives[i].descendants.grandchildren) {
      const prior = lives[i - 1].descendants.grandchildren.find((p) => p.id === g.id);
      if (!prior || !g.alive) continue;
      if (prior.employment === "employed" && g.employment === "unemployed") transitions.add("loss");
      if (
        prior.employment === "unemployed" &&
        g.employment === "employed" &&
        prior.firstPayStatus === "received"
      )
        transitions.add("reemployed");
      if (g.level > prior.level) transitions.add("promotion");
    }
  assert.deepEqual([...transitions].sort(), ["loss", "promotion", "reemployed"]);
  assert.deepEqual(checkpoints(seed), lives);
});

test("grandchild weddings and migration charge prices, preserve parent/player and move living spouse", () => {
  for (const kind of ["wedding", "migration"]) {
    const before = findFamilyCheckpoint((l) =>
      !!l.pendingDecision?.id.startsWith(`descendant-${kind}-grandchild-`) &&
      (kind !== "migration" || l.descendants.grandchildren.some(g => l.pendingDecision!.id.endsWith(`-${g.id}`) && g.spouse?.alive)),
    );
    assert.ok(before, `grandchild ${kind} offer`);
    const person = before.descendants.grandchildren.find((g) =>
      before.pendingDecision!.id.endsWith(`-${g.id}`),
    )!;
    const action = kind === "wedding" ? "generousWedding" : "supportChildMove";
    const after = makeChoice(reload(before), action);
    const actual = after.descendants.grandchildren.find((g) => g.id === person.id)!;
    const cost = before.pendingDecision!.choices.find((c) => c.id === action)!.params.amount;
    assert.ok(
      Math.abs(
        before.stats.savings -
          before.stats.debt -
          after.stats.savings +
          after.stats.debt -
          Number(cost),
      ) < 0.02,
    );
    assert.deepEqual(after.family, before.family);
    assert.equal(after.country.id, before.country.id);
    assert.ok(actual.spouse);
    if (kind === "migration") {
      assert.notEqual(actual.country, person.country);
      assert.equal(actual.spouse!.country, actual.country);
      assert.equal(actual.residence, "independent");
    }
    assert.deepEqual(reload(after), after);
  }
});

test("grandchildren inherit only their parental household; adult residents detach when parent moves", () => {
  const before = findFamilyCheckpoint(
    (l) =>
      l.pendingDecision?.id.startsWith("descendant-migration-child-") &&
      l.descendants.grandchildren.some(g => g.alive && g.age < 18 && g.residence === "home" && l.pendingDecision!.id === `descendant-migration-${g.parentId}`),
  )!;
  assert.ok(before);
  const parent = before.family.children.find((c) =>
    before.pendingDecision!.id.endsWith(`-${c.id}`),
  )!;
  const minor = before.descendants.grandchildren.find(
    (g) => g.parentId === parent.id && g.alive && g.age < 18,
  )!;
  assert.ok(minor);
  assert.equal(minor.residence, "home");
  const moved = makeChoice(before, "supportChildMove");
  assert.equal(
    moved.descendants.grandchildren.find((g) => g.id === minor.id)!.country,
    moved.family.children.find((c) => c.id === parent.id)!.country,
  );
  // Replay the same family with a delayed, still eligible parent migration, after a child comes of age.
  const mature = findFamilyCheckpoint(
    (l) =>
      l.descendants.grandchildren.some(
        (g) => g.alive && g.age >= 19 && g.age < 28 && g.residence === "home",
      ) && !l.pendingDecision && (!l.timeline || l.timeline.complete),
  )!;
  assert.ok(mature, "adult grandchild at parental home");
  const adult = mature.descendants.grandchildren.find(
    (g) => g.alive && g.age >= 19 && g.age < 28 && g.residence === "home",
  )!;
  const p = mature.family.children.find((c) => c.id === adult.parentId)!;
  const state = mature.descendants.children.find((c) => c.childId === p.id)!;
  state.migrationResolved = false;
  state.migratedYear = null;
  state.migrationAt = p.age;
  mature.decisions = mature.decisions.filter((id) => id !== `descendant-migration-${p.id}`);
  const offer = advanceYear(mature);
  assert.equal(offer.pendingDecision?.id, `descendant-migration-${p.id}`);
  const independent = makeChoice(offer, "supportChildMove");
  const actual = independent.descendants.grandchildren.find((g) => g.id === adult.id)!;
  assert.equal(actual.country, adult.country);
  assert.equal(actual.residence, "independent");
  assert.deepEqual(reload(independent), independent);
});

test("grandchild offers queue deterministically by identity without advancing siblings/cousins or paying twice", () => {
  const before = findFamilyCheckpoint((l) =>
    l.pendingDecision?.id.startsWith("descendant-wedding-grandchild-"),
  )!;
  assert.ok(before);
  const after = makeChoice(reload(before), "modestWedding");
  const next = advanceYear(after);
  assert.deepEqual(advanceYear(reload(after)), next);
  assert.equal(after.descendants.totalTransfers, before.descendants.totalTransfers);
  assert.ok(after.descendants.grandchildren.every((g) => g.contribution === 0));
  assert.ok(
    Math.abs(
      after.descendants.children.reduce((n, c) => n + c.contribution, 0) -
        after.descendants.annualTransfers,
    ) < 0.02,
  );
});

test("grandchild spouse identity, home-country and adult-state validation reject malformed current saves", () => {
  const life = findFamilyCheckpoint((l) => l.descendants.grandchildren.some((g) => g.spouse))!;
  assert.ok(life);
  const mutations = [
    (g: any) => delete g.income,
    (g: any) => (g.childId = "wrong"),
    (g: any) => (g.parentId = "orphan"),
    (g: any) => (g.spouse.id = g.id),
    (g: any) => (g.spouse.country = "invalid"),
    (g: any) => {
      g.spouse.birthYear = life.year - 10;
      g.spouse.age = 10;
    },
    (g: any) => {
      g.spouse.country = g.country === "JPN" ? "USA" : "JPN";
    },
    (g: any) => {
      g.residence = "home";
      g.country = g.country === "JPN" ? "USA" : "JPN";
      g.spouse.country = g.country;
    },
    (g: any) => (g.contribution = 100),
  ];
  for (const mutation of mutations) {
    const bad = structuredClone(life);
    mutation(bad.descendants.grandchildren.find((g) => g.spouse)!);
    assert.throws(() => decodeSave(JSON.stringify({ version: 1, life: bad, past: [] })));
  }
});

test("dead grandchildren stop adult activity, living spouses continue aging and enter survivor totals", async () => {
  let life = findFamilyCheckpoint(
    (l) => l.descendants.grandchildren.some((g) => g.spouse?.alive) && !l.pendingDecision && (!l.timeline || l.timeline.complete),
  )!;
  assert.ok(life);
  life = structuredClone(life);
  const grandchild = life.descendants.grandchildren.find((g) => g.spouse?.alive)!;
  grandchild.alive = false;
  grandchild.deathAge = grandchild.age;
  const frozen = structuredClone(grandchild),
    start = life.events.length;
  life.year++;
  life.age++;
  for (const p of [
    ...life.family.parents,
    ...life.family.siblings,
    ...life.family.children,
    ...(life.family.partner ? [life.family.partner] : []),
    ...(life.family.secondPartner ? [life.family.secondPartner] : []),
    ...(life.descendants.greatGrandchildren ?? []),
    ...(life.descendants.greatGreatGrandchildren ?? []),
  ])
    if (p.alive) p.age++;
  yearlyDescendants(life, {
    event: (l, key, kind, icon, params = {}) =>
      l.events.push({
        id: `test-${l.events.length}`,
        age: l.age,
        year: l.year,
        key,
        kind,
        icon,
        params,
      }),
    name: () => "Name",
    mortality: () => 0,
  });
  const actual = life.descendants.grandchildren.find((g) => g.id === grandchild.id)!;
  assert.equal(actual.age, frozen.age);
  assert.equal(actual.income, frozen.income);
  assert.equal(actual.spouse!.age, frozen.spouse!.age + 1);
  assert.ok(!life.events.slice(start).some((e) => e.params.name === grandchild.name));
  const { endingSummary } = await import("../src/lib/ending-story");
  const expectedMembers = [
    ...life.family.parents,
    ...life.family.siblings,
    ...life.family.children,
    ...(life.family.partner ? [life.family.partner] : []),
    ...(life.family.secondPartner ? [life.family.secondPartner] : []),
    ...(life.descendants.greatGrandchildren ?? []),
    ...(life.descendants.greatGreatGrandchildren ?? []),
    ...life.descendants.grandchildren,
    ...life.descendants.children.flatMap((c) => (c.spouse ? [c.spouse] : [])),
    ...life.descendants.grandchildren.flatMap((g) => (g.spouse ? [g.spouse] : [])),
  ];
  assert.equal(endingSummary(life).survivors, expectedMembers.filter((p) => p.alive).length);
  assert.ok(familyMembers(life).some((p) => p.id === actual.spouse!.id));
});

test("simultaneous adult sibling and cousin wedding offers resolve in saved order without advancing the year", () => {
  for (const cousins of [false, true]) {
    const pair = (l: Life) => {
      const candidates = l.descendants.grandchildren.filter(
        (g) => g.alive && g.age >= 18 && g.age < 60 && !g.spouse,
      );
      for (const first of candidates) {
        const second = candidates.find(
          (g) => g.id !== first.id && (g.parentId !== first.parentId) === cousins,
        );
        if (second) return [first, second];
      }
      return null;
    };
    const life = findFamilyCheckpoint((l) => !l.pendingDecision && (!l.timeline || l.timeline.complete) && pair(l))!;
    assert.ok(life);
    const eligible = pair(life)!;
    assert.equal(eligible[0].parentId === eligible[1].parentId, !cousins);
    for (const g of eligible) g.weddingAt = g.age;
    const age = life.age,
      childAges = life.family.children.map((c) => c.age),
      total = life.descendants.totalTransfers;
    let actual = advanceYear(reload(life));
    for (const g of eligible) {
      // An unrelated cousin's age-19 education offer may precede a later cousin's wedding.
      // Resolve it through the public queue, preserving its own choice instead of overwriting it.
      for (
        let queued = 0;
        actual.pendingDecision?.id !== `descendant-wedding-${g.id}` && queued < 64;
        queued++
      ) {
        assert.equal(actual.age, age);
        assert.ok(actual.pendingDecision);
        assert.ok(
          !eligible.some(
            (other) => actual.pendingDecision!.id === `descendant-wedding-${other.id}`,
          ),
        );
        actual = advanceYear(familyChoice(reload(actual)));
      }
      assert.equal(actual.age, age);
      assert.equal(actual.pendingDecision?.id, `descendant-wedding-${g.id}`);
      assert.deepEqual(actual, reload(actual));
      actual = makeChoice(actual, "modestWedding");
      assert.equal(actual.descendants.totalTransfers, total);
      assert.deepEqual(
        actual.family.children.map((c) => c.age),
        childAges,
      );
      actual = advanceYear(reload(actual));
    }
  }
});

test("grandchild pending offers reject forged prices, identity, eligibility and dead applicants", () => {
  const before = findFamilyCheckpoint((l) =>
    l.pendingDecision?.id.startsWith("descendant-wedding-grandchild-"),
  )!;
  assert.ok(before);
  for (const mutation of [
    (l: Life) => (l.pendingDecision!.choices[0].params.amount = 0),
    (l: Life) => (l.pendingDecision!.id = "descendant-wedding-orphan"),
    (l: Life) => {
      const g = l.descendants.grandchildren.find((g) =>
        l.pendingDecision!.id.endsWith(`-${g.id}`),
      )!;
      g.weddingAt = g.age + 1;
    },
    (l: Life) => {
      const g = l.descendants.grandchildren.find((g) =>
        l.pendingDecision!.id.endsWith(`-${g.id}`),
      )!;
      g.alive = false;
      g.deathAge = g.age;
    },
  ]) {
    const bad = structuredClone(before);
    mutation(bad);
    assert.throws(() => decodeSave(JSON.stringify({ version: 1, life: bad, past: [] })));
  }
  const dead = structuredClone(before),
    g = dead.descendants.grandchildren.find((g) => dead.pendingDecision!.id.endsWith(`-${g.id}`))!;
  g.alive = false;
  g.deathAge = g.age;
  assert.deepEqual(makeChoice(dead, "modestWedding"), dead);
});

test("a deceased grandchild spouse stays frozen in their country when the survivor migrates", () => {
  const before = findFamilyCheckpoint(
    (l) =>
      l.pendingDecision?.id.startsWith("descendant-migration-grandchild-") &&
      l.descendants.grandchildren.some(
        (g) => l.pendingDecision!.id.endsWith(`-${g.id}`) && g.spouse?.alive,
      ),
  )!;
  assert.ok(before);
  const grandchild = before.descendants.grandchildren.find((g) =>
    before.pendingDecision!.id.endsWith(`-${g.id}`),
  )!;
  grandchild.spouse!.alive = false;
  grandchild.spouse!.deathAge = grandchild.spouse!.age;
  const frozen = structuredClone(grandchild.spouse);
  const after = makeChoice(reload(before), "supportChildMove");
  assert.deepEqual(
    after.descendants.grandchildren.find((g) => g.id === grandchild.id)!.spouse,
    frozen,
  );
  assert.deepEqual(reload(after), after);
});

test("grouped grandchildren UI shows parental home, independent income, spouse and migration", async () => {
  const life = findFamilyCheckpoint((l) =>
    l.descendants.grandchildren.some(
      (g) => g.spouse && g.migratedYear !== null && g.lastVisitYear !== null,
    ),
  )!;
  assert.ok(life);
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { FamilyDescendants } = await import("../src/components/FamilyDescendants");
  const { translator } = await import("../src/lib/i18n");
  const html = renderToStaticMarkup(
    React.createElement(FamilyDescendants, { life, locale: "en", t: translator("en") }),
  );
  assert.ok(html.includes("Living with their parent"));
  assert.ok(!html.includes("great-grandchildren are not simulated"));
  assert.ok(html.includes("earnings stay in their own household"));
  const g = life.descendants.grandchildren.find(
    (g) => g.spouse && g.migratedYear !== null && g.lastVisitYear !== null,
  )!;
  assert.ok(html.includes(g.name));
  assert.ok(html.includes(g.spouse!.name));
  assert.ok(html.includes(String(g.lastVisitYear)));
});

test("current grandchild state cannot invent unobserved legacy history or impossible adult schooling", () => {
  const before = findFamilyCheckpoint((l) =>
    l.descendants.grandchildren.some((g) => g.alive && g.age >= 30),
  )!;
  assert.ok(before);
  for (const change of [
    (g: any) => (g.education = "preschool"),
    (g: any) => {
      g.education = "unknown";
      g.firstPayStatus = "unknown";
      g.firstPayYear = null;
    },
    (g: any) => {
      g.education = "university";
      g.employment = "student";
      g.income = 0;
      g.job = "student";
      g.studyFunding = "parent";
      g.studyUntil = before.year + 1;
    },
  ]) {
    const bad = structuredClone(before);
    change(bad.descendants.grandchildren.find((g) => g.alive && g.age >= 30)!);
    assert.throws(() => decodeSave(JSON.stringify({ version: 1, life: bad, past: [] })));
  }
});

test("the shared grandchild retirement boundary stops job search and promotion and pays pension income", () => {
  const life = findFamilyCheckpoint(
    (l) =>
      !l.pendingDecision &&
      l.descendants.grandchildren.some((g) => g.alive && g.employment === "employed"),
  )!;
  assert.ok(life);
  const g = life.descendants.grandchildren.find((g) => g.alive && g.employment === "employed")!;
  // Isolated progression boundary: ordinary natural lives end before their grandchildren reach 65.
  // Keep a real generated identity and income, advance only the boundary under mortality-free hooks.
  g.age = 64;
  g.birthYear = life.year - 64;
  const income = g.income,
    level = g.level;
  for (let i = 0; i < 3; i++) {
    life.year++;
    yearlyDescendants(life, { event: () => {}, name: () => "Name", mortality: () => 0 });
    assert.equal(g.employment, "retired");
    assert.equal(g.job, "retired");
    assert.equal(g.income, Math.round(income * 0.25 * 100) / 100);
    assert.equal(g.level, level);
    assert.equal(g.contribution, 0);
  }
});

test("natural ending and annual record exports count grandchild spouses exactly once", async () => {
  const life = findFamilyCheckpoint(l=>!l.alive&&l.descendants.grandchildren.some(g=>g.spouse?.alive));
  const spouses = life.descendants.grandchildren.flatMap((g) => (g.spouse ? [g.spouse] : []));
  assert.ok(spouses.some((p) => p.alive));
  const people = [
    ...life.family.parents,
    ...life.family.siblings,
    ...life.family.children,
    ...(life.family.partner ? [life.family.partner] : []),
    ...(life.family.secondPartner ? [life.family.secondPartner] : []),
    ...(life.descendants.greatGrandchildren ?? []),
    ...(life.descendants.greatGreatGrandchildren ?? []),
    ...life.descendants.grandchildren,
    ...life.descendants.children.flatMap((c) => (c.spouse ? [c.spouse] : [])),
    ...spouses,
  ];
  const expected = people.filter((p) => p.alive).length;
  const { endingSummary } = await import("../src/lib/ending-story");
  const { recordRows } = await import("../src/lib/record-export");
  const { translator } = await import("../src/lib/i18n");
  assert.equal(endingSummary(life).survivors, expected);
  assert.equal(life.history.at(-1)!.annual!.relativesAlive, expected);
  assert.equal(recordRows(life, translator("en")).at(-1)![19], expected);
});

test("large supported families round-trip annual survivor totals above 59 and reject above full capacity", () => {
  const life = findFamilyCheckpoint(l => !l.pendingDecision && l.family.children.filter(c=>
    l.descendants.grandchildren.some(g=>g.parentId===c.id&&g.alive&&g.age>=18)).length >= 3);
  assert.ok(life);
  // Expand a coherent observed family to nine adult grandchildren per child, including twins.
  // All parent identities, birth windows and countries remain anchored to the generated family.
  const grandchildren: Life["descendants"]["grandchildren"] = [];
  for (const parent of life.family.children) {
    const existing = life.descendants.grandchildren.filter((g) => g.parentId === parent.id);
    const adult = existing.find((g) => g.alive && g.age >= 18)!;
    if (!adult) continue;
    for (let i = 0; i < 9; i++) {
      const id = existing[i]?.id ?? `large-grandchild-${grandchildren.length}`;
      const g = structuredClone(existing[i]?.alive && existing[i].age >= 18 ? existing[i] : adult);
      g.id = id;
      g.childId = id;
      g.weddingResolved = true;
      g.marriedYear = life.year;
      g.spouse = {
        id: `large-spouse-${grandchildren.length}`,
        name: `Spouse ${grandchildren.length}`,
        sex: g.sex === "M" ? "F" : "M",
        country: g.country,
        age: g.age,
        birthYear: g.birthYear,
        alive: true,
        deathAge: null,
        job: "service",
      };
      grandchildren.push(g);
    }
  }
  life.descendants.grandchildren = grandchildren;
  for (const state of life.descendants.children) if (state.unionPlan) state.unionPlan.fertilityTarget = 9;
  // This boundary fixture deliberately models only its two constructed generations.
  life.descendants.greatGrandchildren = [];
  life.descendants.greatGreatGrandchildren = [];
  const living = familyMembers(life).filter((p) => p.alive).length;
  assert.ok(living > 59, "capacity fixture must exercise the former 59-person ceiling");
  const recorded = setFocus(life, life.focus === "balanced" ? "health" : "balanced");
  const annual = recorded.history.at(-1)!.annual!;
  assert.equal(annual.grandchildren, grandchildren.length);
  assert.equal(annual.grandchildrenAlive, grandchildren.length);
  assert.equal(annual.relativesAlive, living);
  assert.deepEqual(reload(recorded), recorded);
  const tooMany = structuredClone(recorded);
  const extra = structuredClone(tooMany.descendants.grandchildren[0]);
  extra.id = extra.childId = "tenth-grandchild";
  if (extra.spouse) extra.spouse.id = "tenth-grandchild-spouse";
  tooMany.descendants.grandchildren.push(extra);
  tooMany.history.at(-1)!.annual = null;
  assert.throws(() => decodeSave(JSON.stringify({ version: 1, life: tooMany, past: [] })));
  const impossible = structuredClone(recorded);
  // Supported imported capacity: 2 parents + 8 siblings + 8 children + 8 spouses
  // Later generations now expand this bound; only values above the full cap are impossible.
  impossible.history.at(-1)!.annual!.relativesAlive = MAX_RELATIVES + 1;
  assert.throws(() => decodeSave(JSON.stringify({ version: 1, life: impossible, past: [] })));
});
