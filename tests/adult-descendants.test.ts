import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceYear,
  createLife,
  DEFAULT_SETTINGS,
  makeChoice,
  addReflection,
  requestActivity,
  availableActivities,
} from "../src/game/engine";
import { decodeSave, encodeSave } from "../src/game/storage";
import type { Life, Person } from "../src/game/types";
export function resolve(input: Life): Life {
  let life = input;
  for (let i = 0; i < 80 && (life.pendingDecision || life.timeline && !life.timeline.complete); i++) {
    if (!life.pendingDecision) { life = advanceYear(life); continue; }
    const choices = life.pendingDecision.choices.map((c) => c.id);
    const preferred = [
      "childfree",
      "keepJob",
      "keepDating",
      "refuseRisk",
      "laterSchool",
      "familyHelp",
      "localCare",
      "attendFollowup",
    ];
    life =
      life.pendingDecision.type === "reflection"
        ? addReflection(life, "")
        : makeChoice(life, preferred.find((c) => choices.includes(c)) ?? choices[0]);
  }
  return life;
}
export function familyAt(childAges = [18, 18], playerAge = 55): Life {
  let life = createLife(
    { ...DEFAULT_SETTINGS, country: "JPN", gentler: true, dailyThemeDay: "2026-10-20" },
    124,
  );
  for (let i = 0; i < 300 && life.age < playerAge && life.alive; i++)
    life = advanceYear(resolve(life));
  life = resolve(life);
  assert.equal(life.age, playerAge);
  assert.equal(life.alive, true);
  const old: any = structuredClone(life);
  old.mechanicsVersion = 6;
  delete old.descendants;
  old.family.children = childAges.map(
    (age, i): Person => ({
      id: `child-fixture-${i}`,
      name: `Child ${i}`,
      sex: i % 2 ? "F" : "M",
      country: "JPN",
      age,
      birthYear: life.year - age,
      alive: true,
      deathAge: null,
      job: "none",
    }),
  );
  old.care.handledChildren = [];
  old.stats.savings = 1000000;
  old.stats.investments = 0;
  old.stats.debt = 0;
  old.stats.netAssets = 1000000 + old.belongings.housingValue;
  return decodeSave(JSON.stringify({ version: 1, life: old, past: [] })).life!;
}
test("v6 adults migrate with unknown past and no fabricated events or descendant records", () => {
  const life = familyAt([25]);
  assert.equal(life.mechanicsVersion, 7);
  assert.equal(life.descendants.children[0].education, "unknown");
  assert.equal(life.descendants.children[0].spouse, null);
  assert.deepEqual(life.descendants.grandchildren, []);
  assert.ok(
    life.history.slice(0, -1).every((h) => h.annual === null || h.annual.grandchildren === null),
  );
  assert.ok(!life.events.some((e) => e.key.startsWith("event.descendant")));
  assert.deepEqual(decodeSave(encodeSave(life, [])).life, life);
});
test("simultaneous university decisions preserve order, amounts and checkpoint on reload", () => {
  let life = familyAt();
  life = advanceYear(life);
  assert.equal(life.family.children[0].age, 19);
  assert.equal(life.pendingDecision?.key, "decision.descendantUniversity");
  const first = life.pendingDecision!.params.name,
    age = life.age,
    rng = life.rng;
  const amount = Number(life.pendingDecision!.choices[0].params.amount),
    before = life.stats.savings;
  life = makeChoice(decodeSave(encodeSave(life, [])).life!, "fundUniversity");
  assert.equal(life.stats.savings, Math.round((before - amount) * 100) / 100);
  assert.equal(life.descendants.children[0].education, "university");
  life = advanceYear(life);
  assert.equal(life.age, age);
  assert.equal(life.rng, rng);
  assert.notEqual(life.pendingDecision?.params.name, first);
  life = makeChoice(life, "scholarshipWork");
  assert.equal(life.descendants.children[1].education, "university");
  assert.equal(life.descendants.children[1].studyFunding, "self");
  assert.deepEqual(decodeSave(encodeSave(life, [])).life, life);
});
test("a deterministic long family life records jobs, weddings, homes, migration and grandchildren", () => {
  const play = () => {
    let life = familyAt([18, 20, 22], 48);
    for (let i = 0; i < 400 && life.alive && life.age < 100; i++) {
      if (life.pendingDecision) life = resolve(life);
      else life = advanceYear(life);
      assert.deepEqual(decodeSave(encodeSave(life, [])).life, life);
    }
    return life;
  };
  const life = play();
  assert.deepEqual(play(), life);
  for (const key of [
    "event.descendantJob",
    "event.descendantWedding",
    "event.descendantHome",
    "event.descendantMigration",
    "event.descendantBirth",
    "event.descendantFirstPay",
    "event.descendantContribution",
    "event.descendantVisit",
  ])
    assert.ok(
      life.events.some((e) => e.key === key),
      key,
    );
  assert.ok(life.descendants.grandchildren.length > 0);
  assert.ok(life.descendants.grandchildren.some((g) => g.age > 0));
  assert.ok(life.descendants.children.some((c) => c.spouse));
});
test("player migration carries only living co-resident dependent children", () => {
  let life = familyAt([12, 30]);
  life.descendants.children[1].residence = "independent";
  life = requestActivity(life, "migration");
  const destination = life.migration.offerCountry!.id;
  life = makeChoice(life, "migrateTogether");
  assert.equal(life.family.children[0].country, destination);
  assert.equal(life.family.children[1].country, "JPN");
});
test("current saves reject broken descendant identities, relationships, ages and decisions", () => {
  const life = familyAt([25]);
  const bads = [
    (s: any) => delete s.descendants,
    (s: any) => (s.descendants.children[0].childId = "missing"),
    (s: any) => s.descendants.children.push(structuredClone(s.descendants.children[0])),
    (s: any) => (s.family.children[0].birthYear = s.year - 2),
    (s: any) => (s.descendants.children[0].income = NaN),
    (s: any) =>
      (s.descendants.grandchildren = [
        { ...s.family.children[0], id: "grand-1", parentId: "missing" },
      ]),
    (s: any) =>
      (s.pendingDecision = {
        id: "descendant-university-missing",
        age: s.age,
        type: "choice",
        key: "decision.descendantUniversity",
        params: {},
        choices: [],
      }),
  ];
  for (const mutate of bads) {
    const bad: any = structuredClone(life);
    mutate(bad);
    assert.throws(() => decodeSave(JSON.stringify({ version: 1, life: bad, past: [] })));
  }
});
test("new family totals reach endings and annual exports while legacy rows remain unknown", async () => {
  const { endingSummary } = await import("../src/lib/ending-story");
  const { recordRows } = await import("../src/lib/record-export");
  const { translator } = await import("../src/lib/i18n");
  let life = familyAt([24], 48);
  for (let i = 0; i < 200 && life.alive && life.descendants.grandchildren.length < 2; i++)
    life = life.pendingDecision ? resolve(life) : advanceYear(life);
  assert.ok(life.descendants.grandchildren.length > 0);
  const summary = endingSummary(life);
  assert.equal(summary.grandchildren, life.descendants.grandchildren.length);
  const members = [
    ...life.family.parents,
    ...life.family.siblings,
    ...life.family.children,
    ...(life.family.partner ? [life.family.partner] : []),
    ...life.descendants.children.flatMap((c) => (c.spouse ? [c.spouse] : [])),
    ...life.descendants.grandchildren,
  ];
  assert.equal(summary.survivors, members.filter((p) => p.alive).length);
  const rows = recordRows(life, translator("en"));
  assert.equal(rows[0][20], "Grandchildren alive");
  assert.equal(rows[0][21], "Grandchildren");
  assert.deepEqual(rows[1].slice(20,22), ["", ""]);
  assert.equal(rows.at(-1)![21], life.descendants.grandchildren.length);
});
test("a deceased university student retains a valid frozen history without any future progression", () => {
  let life = familyAt([18]);
  life = makeChoice(advanceYear(life), "fundUniversity");
  const child = life.family.children[0];
  child.alive = false;
  child.deathAge = child.age;
  const start = life.events.length;
  for (let i = 0; i < 60 && life.alive && life.age < 65; i++)
    life = life.pendingDecision ? resolve(life) : advanceYear(life);
  assert.doesNotThrow(() => decodeSave(encodeSave(life, [])));
  assert.ok(
    !life.events
      .slice(start)
      .some((e) => e.key.startsWith("event.descendant") && e.params.name === child.name),
  );
  assert.equal(life.family.children[0].age, 19);
});
test("solo migration leaves children in their actual country and remains importable", () => {
  let life = familyAt([12, 30]);
  life = requestActivity(life, "migration");
  life = makeChoice(life, "migrateAlone");
  assert.equal(life.family.children[0].country, "JPN");
  assert.equal(life.family.children[1].country, "JPN");
  assert.doesNotThrow(() => decodeSave(encodeSave(life, [])));
});
test("family UI exposes adult education, spouse, residence and grandchildren under their parent", async () => {
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { FamilyDescendants } = await import("../src/components/FamilyDescendants");
  const { translator } = await import("../src/lib/i18n");
  let life = familyAt([24], 48);
  for (let i = 0; i < 200 && life.alive && life.descendants.grandchildren.length < 2; i++)
    life = life.pendingDecision ? resolve(life) : advanceYear(life);
  const html = renderToStaticMarkup(
    React.createElement(FamilyDescendants, { life, locale: "en", t: translator("en") }),
  );
  assert.ok(html.includes(life.family.children[0].name));
  assert.ok(html.includes(life.descendants.children[0].spouse!.name));
  assert.ok(html.includes(life.descendants.grandchildren[0].name));
  assert.ok(html.includes("Grandchildren"));
  assert.ok(html.includes("Annual income"));
  const dead = structuredClone(life);
  dead.family.children[0].alive = false;
  dead.family.children[0].deathAge = dead.family.children[0].age;
  assert.ok(
    renderToStaticMarkup(
      React.createElement(FamilyDescendants, { life: dead, locale: "en", t: translator("en") }),
    ).includes("Died"),
  );
});
test("naturally born v7 children progress through saved university, wedding and migration checkpoints", async () => {
  const { naturalFamily } = await import("./helpers/adult-family-simulation");
  let last: Life | undefined;
  const choices = new Set<string>();
  for (const life of naturalFamily(1)) {
    if (life.pendingDecision?.id.startsWith("descendant-")) choices.add(life.pendingDecision.key);
    assert.equal(life.descendants.children.length, life.family.children.length);
    assert.deepEqual(decodeSave(encodeSave(life, [])).life, life);
    last = life;
  }
  assert.deepEqual([...choices].sort(), [
    "decision.descendantMigration",
    "decision.descendantUniversity",
    "decision.descendantWedding",
  ]);
  assert.ok(last!.descendants.grandchildren.length >= 4);
  assert.ok(last!.events.some((e) => e.key === "event.descendantPromotion"));
  assert.equal(last!.alive, false);
});
test("wedding choices charge their stated costs and migration moves the child household only", async () => {
  const { naturalFamily } = await import("./helpers/adult-family-simulation");
  let wedding: Life | undefined, migration: Life | undefined;
  for (const life of naturalFamily()) {
    if (!wedding && life.pendingDecision?.key === "decision.descendantWedding") wedding = life;
    if (!migration && life.pendingDecision?.key === "decision.descendantMigration")
      migration = life;
  }
  assert.ok(wedding);
  assert.ok(migration);
  const generous = makeChoice(wedding, "generousWedding"),
    modest = makeChoice(wedding, "modestWedding");
  const price = (l: Life) => l.stats.savings - l.stats.debt;
  assert.equal(
    Math.round((price(wedding) - price(generous)) * 100),
    Math.round(Number(wedding.pendingDecision!.choices[0].params.amount) * 100),
  );
  assert.equal(
    Math.round((price(wedding) - price(modest)) * 100),
    Math.round(Number(wedding.pendingDecision!.choices[1].params.amount) * 100),
  );
  assert.ok(price(generous) < price(modest));
  const child = migration.family.children.find((c) =>
      migration!.pendingDecision!.id.endsWith(c.id),
    )!,
    beforeCountry = child.country,
    before = migration.country.id;
  const moved = makeChoice(migration, "supportChildMove"),
    state = moved.descendants.children.find((c) => c.childId === child.id)!,
    after = moved.family.children.find((c) => c.id === child.id)!;
  assert.notEqual(after.country, beforeCountry);
  assert.equal(moved.country.id, before);
  assert.equal(state.residence, "independent");
  assert.equal(state.spouse?.country, after.country);
  for (const g of moved.descendants.grandchildren.filter(
    (g) => g.parentId === child.id && g.alive && g.age < 18,
  ))
    assert.equal(g.country, after.country);
  assert.deepEqual(decodeSave(encodeSave(moved, [])).life, moved);
  const stayed = makeChoice(migration, "childStay");
  assert.equal(stayed.family.children.find((c) => c.id === child.id)!.country, beforeCountry);
  assert.equal(price(stayed), price(migration));
});
test("descendant contributions enter annual income exactly once and reload cannot repeat payment", async () => {
  const { naturalFamily } = await import("./helpers/adult-family-simulation");
  let observed = false;
  for (const life of naturalFamily())
    if (life.descendants.annualTransfers > 0 && !life.pendingDecision) {
      const partner =
        life.family.partner?.alive && ["married", "cohabiting"].includes(life.relationship.status)
          ? life.relationship.partnerIncome
          : 0;
      assert.ok(
        Math.abs(
          life.budget.income - life.stats.annualIncome - partner - life.descendants.annualTransfers,
        ) < 0.02,
      );
      assert.ok(
        Math.abs(
          life.descendants.annualTransfers -
            life.descendants.children.reduce((n, c) => n + c.contribution, 0),
        ) < 0.02,
      );
      const loaded = decodeSave(encodeSave(life, [])).life!;
      assert.equal(loaded.stats.savings, life.stats.savings);
      assert.equal(loaded.descendants.totalTransfers, life.descendants.totalTransfers);
      assert.deepEqual(advanceYear(loaded), advanceYear(life));
      observed = true;
      break;
    }
  assert.ok(observed);
});
test("dead parents and dead spouses cannot have new grandchildren or repeat weddings", async () => {
  const { naturalFamily } = await import("./helpers/adult-family-simulation");
  const {findFamilyCheckpoint}=await import("./helpers/adult-family-simulation");
  const base=findFamilyCheckpoint(l=>l.descendants.grandchildren.length>=2&&!l.pendingDecision&&l.descendants.children.some(c=>!!c.spouse&&!!l.family.children.find(p=>p.id===c.childId)?.alive));
  assert.ok(base);
  for (const death of ["parent", "spouse"]) {
    let life = structuredClone(base),
      state = life.descendants.children.find(
        (c) => c.spouse && life.family.children.find((p) => p.id === c.childId)!.alive,
      )!,
      child = life.family.children.find((c) => c.id === state.childId)!;
    const deceased = death === "parent" ? child : state.spouse!;
    deceased.alive = false;
    deceased.deathAge = deceased.age;
    const count = life.descendants.grandchildren.filter((g) => g.parentId === child.id).length,
      age = child.age;
    for (let i = 0; i < 150 && life.alive && life.age < base.age + 12; i++)
      life = life.pendingDecision ? resolve(life) : advanceYear(life);
    assert.equal(
      life.descendants.grandchildren.filter((g) => g.parentId === child.id).length,
      count,
    );
    assert.equal(
      life.events.filter((e) => e.key === "event.descendantWedding" && e.params.name === child.name)
        .length,
      1,
    );
    if (death === "parent")
      assert.equal(life.family.children.find((c) => c.id === child.id)!.age, age);
    assert.doesNotThrow(() => decodeSave(encodeSave(life, [])));
  }
});
test("v6 migration preserves a family living abroad and an existing player decision", () => {
  let life = familyAt([12]);
  life = requestActivity(life, "migration");
  life = makeChoice(life, "migrateAlone");
  const old: any = structuredClone(life);
  old.mechanicsVersion = 6;
  delete old.descendants;
  const restored = decodeSave(JSON.stringify({ version: 1, life: old, past: [] })).life!;
  assert.equal(restored.family.children[0].country, "JPN");
  assert.deepEqual(restored.pendingDecision, life.pendingDecision);
  assert.equal(restored.rng, life.rng);
});
test("current saves reject births before marriage, deceased relationships and overlarge descendant arrays", async () => {
  const { naturalFamily } = await import("./helpers/adult-family-simulation");
  const {findFamilyCheckpoint}=await import("./helpers/adult-family-simulation");
  const sample=findFamilyCheckpoint(l=>l.descendants.grandchildren.length>=2&&l.descendants.grandchildren[0].origin?.union==="married"&&l.descendants.children.some(c=>!!c.spouse));
  assert.ok(sample);
  const bads = [
    (s: any) => (s.descendants.grandchildren[0].parentId = "orphan"),
    (s: any) => (s.descendants.grandchildren[1].id = s.descendants.grandchildren[0].id),
    (s: any) =>
      (s.descendants.grandchildren = Array.from({ length: 33 }, () =>
        structuredClone(s.descendants.grandchildren[0]),
      )),
    (s: any) => {
      const state = s.descendants.children.find((c: any) => c.spouse);
      state.spouse.id = state.childId;
    },
    (s: any) => {
      const g = s.descendants.grandchildren[0],
        state = s.descendants.children.find((c: any) => c.childId === g.parentId);
      g.birthYear = state.marriedYear - 1;
      g.age = s.year - g.birthYear;
    },
    (s: any) => {
      const state = s.descendants.children.find((c: any) => c.spouse);
      state.spouse.alive = false;
      state.spouse.deathAge = state.spouse.age = 18;
    },
  ];
  for (const change of bads) {
    const bad: any = structuredClone(sample);
    change(bad);
    assert.throws(() => decodeSave(JSON.stringify({ version: 1, life: bad, past: [] })));
  }
});
test("work and promotion stories name real roles rather than raw job enum grammar", async () => {
  const { naturalFamily } = await import("./helpers/adult-family-simulation");
  const { translator } = await import("../src/lib/i18n");
  const t = translator("en");
  let checked = 0;
  for (const life of naturalFamily())
    if (!life.alive)
      for (const event of life.events.filter((e) =>
        ["event.descendantJob", "event.descendantPromotion"].includes(e.key),
      )) {
        const text = t(event.key, event.params);
        assert.ok(!/in (nurse|engineer|hairdresser|mechanic)\./.test(text));
        assert.ok(text.includes("as a"));
        checked++;
      }
  assert.ok(checked > 0);
});
test("legacy workers gain forward income without fabricating a first-ever pay story", () => {
  const base = familyAt([30]);
  const old: any = structuredClone(base);
  old.mechanicsVersion = 6;
  delete old.descendants;
  old.family.children[0].job = "nurse";
  let life = decodeSave(JSON.stringify({ version: 1, life: old, past: [] })).life!;
  const start = life.events.length;
  for (let i = 0; i < 20 && life.alive && life.age < base.age + 2; i++)
    life = life.pendingDecision ? resolve(life) : advanceYear(life);
  assert.ok(life.descendants.children[0].income > 0);
  assert.ok(!life.events.slice(start).some((e) => e.key === "event.descendantFirstPay"));
  assert.equal(life.descendants.children[0].firstPayYear, null);
  assert.doesNotThrow(() => decodeSave(encodeSave(life, [])));
});

test("valid long legacy child IDs cannot overflow new spouse or grandchild save identities", () => {
  const base = familyAt([24], 48),
    old: any = structuredClone(base);
  old.mechanicsVersion = 6;
  delete old.descendants;
  old.family.children[0].id = "x".repeat(200);
  let life = decodeSave(JSON.stringify({ version: 1, life: old, past: [] })).life!;
  for (let i = 0; i < 180 && life.alive && life.descendants.grandchildren.length === 0; i++) {
    life = life.pendingDecision ? resolve(life) : advanceYear(life);
    assert.doesNotThrow(() => decodeSave(encodeSave(life, [])));
  }
  assert.ok(life.descendants.grandchildren.length > 0);
});

test("an independently living child stays independent after a wedding and preserves migration history", async () => {
  const { naturalFamily } = await import("./helpers/adult-family-simulation");
  let before: Life | undefined;
  for (const life of naturalFamily()) {
    if (life.pendingDecision?.key === "decision.descendantWedding") {
      before = structuredClone(life);
      break;
    }
  }
  assert.ok(before);
  const childId = before.family.children.find((child) =>
    before!.pendingDecision!.id.endsWith(`-${child.id}`),
  )!.id;
  const history = before.descendants.children.find((child) => child.childId === childId)!;
  history.migrationResolved = true;
  history.migratedYear = before.year - 1;
  history.residence = "independent";
  before.descendants.rng = 0;
  const restored = decodeSave(encodeSave(before, [])).life!;
  assert.deepEqual(restored, before);

  const after = makeChoice(restored, "modestWedding");
  const household = after.descendants.children.find((child) => child.childId === childId)!;
  assert.equal(household.residence, "independent");
  assert.equal(household.migratedYear, before.year - 1);
  assert.equal(household.migrationResolved, true);
  assert.ok(household.spouse);
  assert.deepEqual(decodeSave(encodeSave(after, [])).life, after);

  const unresolved = structuredClone(after);
  unresolved.descendants.children.find((child) => child.childId === childId)!.migrationResolved = false;
  assert.throws(() => decodeSave(JSON.stringify({ version: 1, life: unresolved, past: [] })));

  const remote = structuredClone(after);
  const remoteChild = remote.family.children.find((child) => child.id === childId)!;
  const remoteHousehold = remote.descendants.children.find((child) => child.childId === childId)!;
  remoteChild.country = remote.country.id === "USA" ? "JPN" : "USA";
  remoteHousehold.spouse!.country = remoteChild.country;
  remoteHousehold.residence = "home";
  assert.throws(() => decodeSave(JSON.stringify({ version: 1, life: remote, past: [] })));
});


test("parents with six or seven children can have another child and preserve the family on reload", () => {
  for (const count of [6, 7]) {
    const life = familyAt(Array.from({ length: count }, (_, i) => 12 - i), 40);
    assert.ok(life.family.partner?.alive);
    life.relationship.status = "married"; life.family.married = true; life.family.marriageAge = 30;
    assert.ok(availableActivities(life).includes("familyPlanning"));
    const offered = requestActivity(life, "familyPlanning");
    assert.equal(offered.pendingDecision?.key, "decision.children");
    const born = makeChoice(offered, "haveChild");
    assert.equal(born.family.children.length, count + 1);
    assert.equal(born.family.children.at(-1)!.age, 0);
    assert.equal(born.descendants.children.length, count + 1);
    assert.deepEqual(decodeSave(encodeSave(born, [])).life, born);
  }
});

test("automatic family planning still offers a seventh child but stops at supported capacity", () => {
  const life = familyAt([12, 11, 10, 9, 8, 7], 40);
  life.relationship.status = "married"; life.family.married = true; life.family.marriageAge = 30;
  life.relationship.childPlan = "open";
  life.relationship.nextChildDecisionAge = life.age;
  assert.equal(advanceYear(life).pendingDecision?.key, "decision.children");
  const full = familyAt([12, 11, 10, 9, 8, 7, 6, 5], 40);
  full.relationship.status = "married"; full.family.married = true; full.family.marriageAge = 30;
  full.relationship.childPlan = "open";
  full.relationship.nextChildDecisionAge = full.age;
  assert.ok(!availableActivities(full).includes("familyPlanning"));
  assert.equal(requestActivity(full, "familyPlanning"), full);
  assert.notEqual(advanceYear(full).pendingDecision?.key, "decision.children");
});


test("eight naturally born children retain healthcare and childcare decisions through a complete saved life", async () => {
  const { naturalFamily } = await import("./helpers/adult-family-simulation");
  let highest = 0; let last: Life | undefined;
  for (const life of naturalFamily(124, 8)) {
    highest = Math.max(highest, life.family.children.length);
    assert.deepEqual(decodeSave(encodeSave(life, [])).life, life);
    last = life;
  }
  assert.equal(highest, 8);
  assert.equal(last!.alive, false);
  assert.ok(last!.care.handledChildren.includes(last!.family.children[7].id));
  assert.ok(last!.healthcare.childChecks.some(c => c.id === last!.family.children[7].id));
});
