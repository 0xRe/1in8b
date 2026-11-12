import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { createLife, DEFAULT_SETTINGS } from "../src/game/engine";
import type { GameEvent } from "../src/game/types";
import { defaultScenes, loadFilmSettings, normalizeFilmSettings, saveFilmSettings } from "../src/lib/film-model";
import { saveAlbum, saveRecordBook } from "../src/lib/keepsakes";
import { albumDocument, recordLifeFilm } from "../src/lib/life-media";
import { translator } from "../src/lib/i18n";

function globals(t: TestContext, values: Record<string, unknown>) {
  for (const [key, value] of Object.entries(values)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : Reflect.deleteProperty(globalThis, key));
  }
}
function fixture(t: TestContext) {
  const life = createLife(DEFAULT_SETTINGS, 847);
  life.events = Array.from({ length: 15 }, (_, i): GameEvent => ({
    id: `moment-${i}`, age: i, year: life.birthYear + i,
    key: `unique-event-${i}`, params: {}, icon: "star",
    kind: i === 14 ? "everyday" : i === 13 ? "finance" : "milestone",
  }));
  const storage = new Map<string, string>();
  globals(t, { localStorage: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  } });
  return { life, storage };
}
function captureDownload(t: TestContext) {
  let blob: Blob | undefined;
  globals(t, { document: { createElement: () => ({ click() {} }) } });
  t.mock.method(URL, "createObjectURL", (value: Blob) => { blob = value; return "blob:test"; });
  t.mock.method(URL, "revokeObjectURL", () => {});
  return async () => { assert.ok(blob); return blob.text(); };
}

test("legacy album exports every starred event beyond the studio scene limit", async t => {
  const { life } = fixture(t), downloaded = captureDownload(t);
  saveAlbum(life, "en", translator("en"), [...life.events.map(e => e.id), "foreign", "moment-0"]);
  const html = await downloaded();
  assert.equal((html.match(/<article>/g) ?? []).length, 15);
  assert.ok(html.includes("unique-event-14"));
});

test("legacy album without stars includes all non-everyday events, including finance", async t => {
  const { life } = fixture(t), downloaded = captureDownload(t);
  saveAlbum(life, "en", translator("en"));
  const html = await downloaded();
  assert.equal((html.match(/<article>/g) ?? []).length, 14);
  assert.ok(html.includes("unique-event-13"));
  assert.ok(!html.includes("unique-event-14"));
  assert.equal((albumDocument(life, "en", translator("en"), normalizeFilmSettings(null, life)).match(/<article>/g) ?? []).length, 10);
});

test("first studio load and legacy album inherit room title, words and captions", async t => {
  const { life, storage } = fixture(t), downloaded = captureDownload(t);
  storage.set(`1in8bn-room-${life.id}`, JSON.stringify({title: "Our family album", words: "Keep these memories", captions: {"moment-0": "First steps"}}));
  const settings = loadFilmSettings(life);
  assert.equal(settings.title, "Our family album");
  assert.equal(settings.words, "Keep these memories");
  assert.equal(settings.captions["moment-0"], "First steps");
  saveAlbum(life, "en", translator("en"));
  const html = await downloaded();
  assert.ok(html.includes("<h1>Our family album</h1>"));
  assert.ok(html.includes("Keep these memories"));
  assert.ok(html.includes("First steps"));
});

test("saved empty studio text stays empty instead of restoring room text", async t => {
  const { life, storage } = fixture(t), downloaded = captureDownload(t);
  storage.set(`1in8bn-room-${life.id}`, JSON.stringify({title: "Old title", words: "Old words", captions: {"moment-0": "Old caption"}}));
  saveFilmSettings(life, normalizeFilmSettings({title: "", words: "", captions: {"moment-0": ""}}, life));
  const settings = loadFilmSettings(life);
  assert.equal(settings.title, "");
  assert.equal(settings.words, "");
  assert.equal(settings.captions["moment-0"], "");
  saveAlbum(life, "en", translator("en"), ["moment-0"]);
  const html = await downloaded();
  assert.ok(html.includes("<h1></h1>"));
  assert.ok(!/Old title|Old words|Old caption|unique-event-0/.test(html));
});

test("legacy albums retain escaped reflections while studio albums use selected captions", async t => {
  const { life } = fixture(t), downloaded = captureDownload(t);
  life.events[0].kind = "reflection";
  life.reflections["0"] = "<script>Remember our summer</script>";
  saveAlbum(life, "en", translator("en"), ["moment-0"]);
  const html = await downloaded();
  assert.ok(html.includes("<blockquote>&lt;script&gt;Remember our summer&lt;/script&gt;</blockquote>"));
  assert.ok(!html.includes("<script>"));
  const studio = albumDocument(life, "en", translator("en"), normalizeFilmSettings({sceneIds: ["moment-0"]}, life));
  assert.ok(!studio.includes("Remember our summer"));
});

test("default scenes prefer substantive events over generic choices", t => {
  const { life } = fixture(t);
  const choices = life.events.map((event, i) => ({ ...event, id: `choice-${i}`, key: "event.choice", kind: "decision" as const }));
  life.events = life.events.flatMap((event, i) => [event, choices[i]]);
  const scenes = defaultScenes(life);
  assert.equal(scenes.length, 10);
  assert.ok(scenes.every(event => event.key !== "event.choice"));
  assert.equal(scenes[0].id, "moment-0");
  assert.equal(scenes.at(-1)?.id, "moment-12");
});

for (const action of ["abort", "hide", "already hidden", "resume then abort", "resume then hide"] as const) {
  test(`recording ${action} while audio resume is pending releases resources without starting`, async t => {
    const { life } = fixture(t);
    const controller = new AbortController();
    let stopped = 0, closed = 0, started = 0, constructed = 0;
    let resume: (() => void) | undefined;
    const document = Object.assign(new EventTarget(), {
      hidden: action === "already hidden",
      createElement: () => ({
        captureStream: () => ({ getTracks: () => [{ stop: () => stopped++ }] }),
      }),
    });
    class PendingAudio {
      state = "suspended";
      resume() { return new Promise<void>(resolve => { resume = resolve; }); }
      // A slow close must not delay the cancellation result either.
      close() { closed++; this.state = "closed"; return new Promise<void>(() => {}); }
    }
    class Recorder {
      static isTypeSupported() { return true; }
      constructor() { constructed++; }
      start() { started++; }
    }
    globals(t, { document, AudioContext: PendingAudio, MediaRecorder: Recorder });
    const pending = recordLifeFilm(life, translator("en"), normalizeFilmSettings(null, life), "teaser", () => {}, controller.signal);
    const outcome = pending.then(() => "unexpected success", error => error);
    if (action.startsWith("resume")) resume?.();
    if (action.endsWith("abort")) controller.abort();
    if (action.endsWith("hide")) { document.hidden = true; document.dispatchEvent(new Event("visibilitychange")); }
    const timeout = Symbol("still pending");
    let timer: ReturnType<typeof setTimeout>;
    const result = await Promise.race([outcome, new Promise(resolve => { timer = setTimeout(() => resolve(timeout), 100); })]);
    clearTimeout(timer!);
    assert.notEqual(result, timeout, "cancellation must not wait for audio permission");
    assert.ok(result instanceof Error);
    assert.match(result.message, action.endsWith("abort") ? /Cancelled/ : /hidden/);
    assert.equal(stopped, 1);
    assert.equal(closed, action === "already hidden" ? 0 : 1);
    assert.equal(constructed, 0);
    assert.equal(started, 0);
    resume?.();
    await Promise.resolve();
    await Promise.resolve();
    assert.equal(constructed, 0, "a late permission grant must not restart cancelled work");
    assert.equal(started, 0);
  });
}


test("record books preserve age-matched reflections as escaped multiline text", async t => {
  const { life } = fixture(t), downloaded = captureDownload(t);
  life.events[0].kind = "reflection"; life.events[1].kind = "reflection";
  life.reflections["0"] = "First line\n<script>alert(1)</script> & family";
  life.reflections["1"] = "另一个回顾🌱";
  life.reflections["2"] = "Unrelated hidden note";
  saveRecordBook(life,"en",translator("en"));
  const html=await downloaded();
  assert.ok(html.includes("<blockquote>First line\n&lt;script&gt;alert(1)&lt;/script&gt; &amp; family</blockquote>"));
  assert.ok(html.includes("<blockquote>另一个回顾🌱</blockquote>"));
  assert.ok(!html.includes("<script>")); assert.ok(!html.includes("Unrelated hidden note"));
  assert.match(html,/blockquote\s*\{[^}]*white-space:pre-wrap/);
});
test("record books omit empty reflections and keep ordinary events", async t => {
  const { life } = fixture(t), downloaded = captureDownload(t);
  life.events[0].kind="reflection";life.reflections["0"]="";
  saveRecordBook(life,"en",translator("en"));const html=await downloaded();
  assert.ok(!html.includes("<blockquote>"));assert.ok(html.includes("unique-event-14"));
});

for(const empty of [true,false])test(`recording ${empty?'without':'with'} encoded data reports the correct outcome and releases tracks`,async t=>{
 const {life}=fixture(t);let stopped=0;
 const ctx=new Proxy({measureText:(text:string)=>({width:text.length*8})},{get:(target,key)=>Reflect.get(target,key)??(()=>{})});
 const document=Object.assign(new EventTarget(),{hidden:false,createElement:()=>({width:720,height:1280,getContext:()=>ctx,captureStream:()=>({getTracks:()=>[{stop:()=>stopped++}]})})});
 class Recorder {
  static isTypeSupported(){return true;} state='inactive';ondataavailable?: (event:{data:Blob})=>void;onstop?:()=>void;
  start(){this.state='recording';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(empty?[]:['encoded frames'])});this.stop();});}
  stop(){this.state='inactive';this.onstop?.();}
 }
 globals(t,{document,MediaRecorder:Recorder});
 const settings=normalizeFilmSettings({music:'silent'},life);
 const pending=recordLifeFilm(life,translator('en'),settings,'teaser',()=>{},new AbortController().signal);
 if(empty)await assert.rejects(pending,error=>error instanceof Error&&error.message===translator('en')('feature.recordFailed'));
 else assert.equal(await (await pending).text(),'encoded frames');
 assert.equal(stopped,1);
});
for(const stage of ['initial','frame'] as const)test(`a ${stage} drawing failure settles recording and removes listeners`,async t=>{
 const {life}=fixture(t);const controller=new AbortController();let stopped=0,draws=0,listeners=0;let tick:(()=>void)|undefined;
 const ctx=new Proxy({measureText:(text:string)=>({width:text.length*8})},{get:(target,key)=>Reflect.get(target,key)??(()=>{})});
 const canvas={width:720,height:1280,getContext:()=>{if(++draws>(stage==='initial'?0:1))throw Error('Canvas unavailable');return ctx;},captureStream:()=>({getTracks:()=>[{stop:()=>stopped++}]})};
 const document=Object.assign(new EventTarget(),{hidden:false,createElement:()=>canvas});
 const add=document.addEventListener.bind(document),remove=document.removeEventListener.bind(document);
 document.addEventListener=(...args:Parameters<typeof add>)=>{listeners++;add(...args);};document.removeEventListener=(...args:Parameters<typeof remove>)=>{listeners--;remove(...args);};
 class Recorder{static isTypeSupported(){return true;}state='inactive';start(){this.state='recording';}stop(){this.state='inactive';}}
 globals(t,{document,MediaRecorder:Recorder});t.mock.method(globalThis,'setInterval',((callback:()=>void)=>{tick=callback;return 1;}) as typeof setInterval);t.mock.method(globalThis,'clearInterval',()=>{});
 t.after(()=>controller.abort());
 const pending=recordLifeFilm(life,translator('en'),normalizeFilmSettings({music:'silent'},life),'teaser',()=>{},controller.signal);
 const outcome=pending.then(()=>null,error=>error);
 if(stage==='frame')assert.doesNotThrow(()=>tick?.());
 const error=await outcome;assert.ok(error instanceof Error);assert.equal(error.message,translator('en')('feature.recordFailed'));assert.equal(stopped,1);assert.equal(listeners,0);
});

for(const cause of ['error','cancel'] as const)test(`recorder stop failure during ${cause} still settles and releases tracks`,async t=>{
 const {life}=fixture(t);let stopped=0;const controller=new AbortController();
 const ctx=new Proxy({measureText:(text:string)=>({width:text.length*8})},{get:(target,key)=>Reflect.get(target,key)??(()=>{})});
 const document=Object.assign(new EventTarget(),{hidden:false,createElement:()=>({width:720,height:1280,getContext:()=>ctx,captureStream:()=>({getTracks:()=>[{stop:()=>stopped++}]})})});
 let rec:Recorder;
 class Recorder {
  static isTypeSupported(){return true;}state='inactive';onerror?:()=>void;
  constructor(){rec=this;}start(){this.state='recording';}
  stop(){throw new DOMException('Recorder shutdown failed','InvalidStateError');}
 }
 globals(t,{document,MediaRecorder:Recorder});
 const outcome=recordLifeFilm(life,translator('en'),normalizeFilmSettings({music:'silent'},life),'teaser',()=>{},controller.signal).then(()=>null,error=>error);
 // Exercise the recorder error callback directly; abort uses the same failure path.
 if(cause==='error')assert.doesNotThrow(()=>rec.onerror?.());
 else controller.abort();
 const timeout=Symbol('pending');let timer:ReturnType<typeof setTimeout>;
 const result=await Promise.race([outcome,new Promise(resolve=>{timer=setTimeout(()=>resolve(timeout),100);})]);clearTimeout(timer!);
 assert.notEqual(result,timeout);assert.ok(result instanceof Error);
 assert.equal(result.message,cause==='cancel'?'Cancelled':translator('en')('feature.recordFailed'));
 assert.equal(stopped,1);
});
