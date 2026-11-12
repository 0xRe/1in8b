import test from "node:test";
import assert from "node:assert/strict";
import { pixelScene, sceneKind } from "../src/lib/pixel-art";

const partner = { id: "p-1", name: "Wang Ming", birthYear: 1994, deathAge: null, alive: true, sex: "M" };
const child = { id: "c-1", name: "Mei", birthYear: 2029, deathAge: null, alive: true, sex: "F" };
const life = (age: number, family: Record<string, unknown> = {}) => ({ seed: 123456789, age, sex: "F", birthYear: 1996, alive: true, residence: "urban", pets: [], stats: { job: "engineer" }, pendingDecision: null, family: { partner, marriageAge: 30, children: [], ...family } }) as never;

test("the year of the marriage shows the wedding, not the everyday street", () => {
  assert.equal(sceneKind(life(29)), "city");
  assert.equal(sceneKind(life(30)), "wedding");
  assert.equal(sceneKind(life(31)), "city");
});

test("the year a child is born shows the nursery from the parent's side", () => {
  assert.equal(sceneKind(life(33, { children: [child] })), "nursery");
  assert.equal(sceneKind(life(34, { children: [child] })), "city");
  // The player's own infancy keeps its nursery.
  assert.equal(sceneKind(life(1, { partner: null, marriageAge: null })), "nursery");
});

test("after the wedding the spouse and young children appear outside the home too", () => {
  const alone = pixelScene(life(29)), married = pixelScene(life(31)), parents = pixelScene(life(40, { children: [child] }));
  assert.notDeepEqual(married.rects, alone.rects);
  assert.notDeepEqual(parents.rects, married.rects);
  // A widowed player walks alone again.
  const widowed = pixelScene(life(70, { partner: { ...partner, deathAge: 70 } }), undefined, "city");
  const unmarried = pixelScene(life(70, { partner: null, marriageAge: null }), undefined, "city");
  assert.deepEqual(widowed.rects, unmarried.rects);
});

test("a choice still decides the scene over the year's family moment", () => {
  assert.equal(sceneKind({ ...(life(30) as object), pendingDecision: { key: "careerChoice" } } as never), "work");
});

test("the year a spouse dies shows their grave with the living player beside it", () => {
  const widowing = life(70, { partner: { ...partner, alive: false, deathAge: 72 } });
  assert.equal(sceneKind(widowing), "memorial");
  const own = pixelScene({ ...(life(70, { partner: null, marriageAge: null }) as object), alive: false } as never);
  assert.equal(own.kind, "memorial");
  assert.notDeepEqual(pixelScene(widowing).rects, own.rects, "the mourner stands at the spouse's grave, not at the player's own");
});

test("young grandchildren come along once the children have grown", () => {
  const grown = { ...child, birthYear: 2025 };
  const without = pixelScene(life(66, { children: [grown] }), undefined, "park");
  const withGrand = pixelScene({ ...(life(66, { children: [grown] }) as object), descendants: { grandchildren: [{ id: "g-1", birthYear: 2058, deathAge: null, sex: "F" }] } } as never, undefined, "park");
  assert.notDeepEqual(withGrand.rects, without.rects);
});
