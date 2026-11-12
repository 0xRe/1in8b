import test from "node:test";
import assert from "node:assert/strict";
import { pixelScene, SCENE_KINDS } from "../src/lib/pixel-art";

const subject = (seed: number, age: number, sex: "M" | "F") => ({ seed, age, sex, birthYear: 1990, alive: true, residence: "urban", pets: [], stats: { job: "teacher" }, family: { partner: null, marriageAge: null, children: [] }, pendingDecision: null }) as never;

test("figures keep palette colours for seeds whose high bit is set", () => {
  for (const seed of [0x80000000, 0x9e3779b9, 0xfffffff0, 12345])
    for (const kind of SCENE_KINDS)
      for (const [age, sex] of [[8, "F"], [30, "M"], [70, "F"]] as const) {
        const rects = pixelScene(subject(seed, age, sex), undefined, kind).rects;
        assert.ok(rects.every((r) => /^#[0-9a-f]{6}$/.test(r.color) && r.color !== "#000000"), `${seed} ${kind} ${age}`);
      }
});
