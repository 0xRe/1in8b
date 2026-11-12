/** Deterministic QA policy using only public game actions, never injected family state. */
import {
  addReflection,
  advanceYear,
  createLife,
  DEFAULT_SETTINGS,
  makeChoice,
} from "../../src/game/engine";
import type { Life } from "../../src/game/types";
export function familyChoice(life: Life, maxChildren = 6): Life {
  const decision = life.pendingDecision;
  if (!decision) return advanceYear(life);
  if (decision.type === "reflection") return addReflection(life, "");
  const ids = decision.choices.map((c) => c.id);
  const childIndex = life.family.children.findIndex((c) => decision.id.endsWith(`-${c.id}`));
  if (childIndex % 2 === 1) {
    for (const choice of ["scholarshipWork", "modestWedding", "childStay"])
      if (ids.includes(choice)) return makeChoice(life, choice);
  }
  if (ids.includes("haveChild") && life.family.children.length >= maxChildren) return makeChoice(life, "childfree");
  const preferred = [
    "haveChild",
    "marry",
    "partner",
    "fundUniversity",
    "generousWedding",
    "supportChildMove",
    "offer0",
    "localCare",
    "attendFollowup",
    "refuseRisk",
    "keepJob",
    "laterSchool",
    "familyHelp",
    "grandparents",
    "daycare",
  ];
  return makeChoice(life, preferred.find((id) => ids.includes(id)) ?? ids[0]);
}
export function* naturalFamily(seed = 124, maxChildren = 6, country = "JPN"): Generator<Life> {
  let life = createLife(
    { ...DEFAULT_SETTINGS, country, gentler: true, dailyThemeDay: "2026-10-20" },
    seed,
  );
  for (let step = 0; step < 500; step++) {
    yield life;
    if (!life.alive) return;
    life = familyChoice(life, maxChildren);
  }
  throw new Error("QA life failed to finish within 500 actions.");
}

/** Locate a real public-action checkpoint by its required scenario, never by injected state.
 * Bounded discovery keeps a disappeared mechanic a test failure rather than silently skipping it.
 */
export function findFamilyCheckpoint(predicate: (life: Life) => boolean, country = 'JPN', maxSeeds = 64): Life {
  for (let seed = 1; seed <= maxSeeds; seed++) {
    for (const life of naturalFamily(seed, 6, country)) if (predicate(life)) return life;
  }
  throw new Error(`No natural family checkpoint matched in ${country}, seeds1..${maxSeeds}`);
}
