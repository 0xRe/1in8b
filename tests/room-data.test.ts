import test from "node:test";
import assert from "node:assert/strict";
import { normalizeRoom, normalizeAlbum } from "../src/lib/room-data";
test("public room normalization bounds text and rejects malformed choices", () => {
  const room = normalizeRoom({
    wall: "url(evil)",
    items: Array(8).fill("evil"),
    title: "a".repeat(100),
    words: [],
    captions: { hello: "safe" },
  });
  assert.equal(room.wall, "cream");
  assert.equal(room.title.length, 80);
  assert.equal(room.words, "");
  assert.deepEqual(room.items, Array(8).fill("empty"));
  assert.equal(room.captions.hello, "safe");
  assert.deepEqual(
    normalizeAlbum([
      { age: -1, year: 2026 },
      { age: 8, year: 2034, text: "b".repeat(1000), caption: "safe" },
    ]).map((x) => [x.age, x.text.length]),
    [[8, 600]],
  );
});
test("transfer round trip restores decorated rooms and captions", async () => {
  const { createLife, DEFAULT_SETTINGS } = await import("../src/game/engine");
  const { exportBackup, importBackup } = await import("../src/lib/transfer");
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
    },
    configurable: true,
  });
  const life = createLife(DEFAULT_SETTINGS, 1234),
    key = `1in8bn-room-${life.id}`;
  values.set(
    key,
    JSON.stringify({
      title: "Our home",
      wall: "blue",
      captions: { [life.events[0].id]: "A new beginning" },
    }),
  );
  const text = exportBackup(life, []);
  values.clear();
  const restored = importBackup(text);
  for(const [key,value] of restored.metadata)localStorage.setItem(key,value);
  assert.equal(restored.life?.id, life.id);
  assert.equal(JSON.parse(values.get(key)!).title, "Our home");
  assert.equal(
    JSON.parse(values.get(key)!).captions[life.events[0].id],
    "A new beginning",
  );
});

test("expanded memorial settings survive normalization with bounded occupants", () => {
  const room = normalizeRoom({wall:"flowers",floor:"tatami",window:"fireflies",clothes:"navy",music:"waltz",people:"family",occupants:99,items:Array(8).fill("aquarium")});
  assert.equal(room.wall,"flowers");assert.equal(room.floor,"tatami");assert.equal(room.window,"fireflies");
  assert.equal(room.clothes,"navy");assert.equal(room.music,"waltz");assert.equal(room.people,"family");assert.equal(room.occupants,6);
  assert.deepEqual(room.items,Array(8).fill("aquarium"));
  const invalid=normalizeRoom({clothes:"url(evil)",music:"https://evil",people:"bad",occupants:NaN});
  assert.equal(invalid.clothes,"everyday");assert.equal(invalid.music,"default");assert.equal(invalid.people,"alone");assert.equal(invalid.occupants,1);
});
test("new room furniture edits survive closing, backup and public normalization",()=>{
  const room=normalizeRoom(null);assert.equal(room.items.length,8);room.items[0]="aquarium";
  const reloaded=normalizeRoom(JSON.parse(JSON.stringify(room)));assert.equal(reloaded.items[0],"aquarium");assert.equal(reloaded.items.length,8);
});
test("public album artwork accepts only bounded local scene metadata",()=>{
 const scenes=normalizeAlbum([{age:20,year:2046,text:"Work",scene:{kind:"work",seed:123,sex:"F"}},{age:20,year:2046,scene:{kind:"javascript:alert(1)",seed:-1,sex:"bad"}}]);
 assert.deepEqual(scenes[0].scene,{kind:"work",seed:123,sex:"F"});assert.equal(scenes[1].scene,undefined);
});
