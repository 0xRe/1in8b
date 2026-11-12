import assert from "node:assert/strict";
import test from "node:test";
import { createLife, DEFAULT_SETTINGS } from "../src/game/engine";
import { normalizeFilmSettings, type FilmFormat } from "../src/lib/film-model";
import { drawFilmFrame } from "../src/lib/life-media";
import { translator } from "../src/lib/i18n";

// Capture actual canvas text commands; pixel rendering still executes normally.
function frame(format: FilmFormat, seconds: number) {
  const life = createLife(DEFAULT_SETTINGS, 44);
  life.name = "Maya";
  life.age = 80;
  life.year = life.birthYear + 80;
  life.alive = false;
  life.hobbies = [];
  const settings = normalizeFilmSettings({
    title: "A lifetime",
    words: "Thank you for these years.",
    captions: { [life.events[0].id]: "Our first day." },
  }, life);
  const drawn: string[] = [];
  const context = new Proxy({
    measureText: (text: string) => ({ width: text.length * 3 }),
    fillText: (text: string) => drawn.push(text),
  }, {
    get: (target, key) => key in target ? target[key as keyof typeof target] : () => {},
    set: () => true,
  });
  drawFilmFrame({ width: 720, height: 1280, getContext: () => context } as unknown as HTMLCanvasElement,
    life, translator("en"), settings, format, seconds);
  return drawn.join("\n");
}

test("full life film closes the main story before its final 22-second epilogue", () => {
  assert.match(frame("film", 0), /A lifetime/);
  assert.match(frame("film", 10), /Our first day\./);
  assert.match(frame("film", 75), /Thank you for these years\./);
  assert.match(frame("film", 78), /The long way home/);
  assert.match(frame("film", 81), /Maya takes the familiar street slowly\./);
  assert.match(frame("film", 89), /A shopkeeper is pulling down a sunshade/);
  assert.match(frame("film", 99), /There is still enough daylight to take the long way home\./);
  assert.doesNotMatch(frame("film", 99), /Thank you for these years\./);
});

test("standalone epilogue and the full film share final-chapter narration", () => {
  for (const elapsed of [0, 3, 11, 21, 22]) {
    assert.equal(frame("film", 78 + elapsed), frame("epilogue", elapsed));
  }
});

test("teaser keeps its closing words without adding an epilogue", () => {
  assert.match(frame("teaser", 19), /Thank you for these years\./);
  assert.doesNotMatch(frame("teaser", 19), /The long way home/);
});
