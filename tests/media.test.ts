import assert from "node:assert/strict";
import test from "node:test";
import { createLife, DEFAULT_SETTINGS, advanceYear, makeChoice, addReflection } from "../src/game/engine";
import { normalizeFilmSettings, selectedScenes, FORMAT_SECONDS } from "../src/lib/film-model";
import { pixelScene, sceneKind, sceneSvg } from "../src/lib/pixel-art";
import { albumDocument, shareText } from "../src/lib/life-media";
import { translator } from "../src/lib/i18n";

function lifetime() {
  let life=createLife({...DEFAULT_SETTINGS,gentler:true},847);
  for(let i=0;i<1200&&life.alive;i++)life=life.pendingDecision?life.pendingDecision.type==="reflection"?addReflection(life,"<script>alert(1)</script>"):makeChoice(life,life.pendingDecision.choices[0].id):advanceYear(life);
  assert.equal(life.alive,false);return life;
}
test("film editor retains a bounded chronological selection and rejects foreign IDs",()=>{
  const life=lifetime(),settings=normalizeFilmSettings({sceneIds:[...life.events.map(e=>e.id).reverse(),"foreign","foreign"],title:"t".repeat(200),music:"bad",mood:"javascript:",captions:{foreign:"bad",[life.events[0].id]:"a".repeat(1000)}},life);
  assert.equal(settings.sceneIds.length,10);assert.equal(settings.title.length,80);assert.equal(settings.music,"piano");assert.equal(settings.mood,"paper");
  assert.equal(settings.captions.foreign,undefined);assert.equal(settings.captions[life.events[0].id].length,240);
  const selected=selectedScenes(life,settings);assert.deepEqual(selected.map(e=>e.age),selected.map(e=>e.age).sort((a,b)=>a-b));
  assert.ok(normalizeFilmSettings({sceneIds:[]},life).sceneIds.length);
  assert.deepEqual(FORMAT_SECONDS,{film:100,teaser:20,epilogue:22});
});
test("pixel artwork changes with event context and is deterministic and self-contained",()=>{
  const life=lifetime(),event={...life.events[0],age:40,key:"event.healthIcu"};
  assert.equal(sceneKind(life,event),"hospital");
  const first=pixelScene(life,event);assert.deepEqual(first,pixelScene(life,event));
  assert.notDeepEqual(first.rects,pixelScene(life,life.events[0]).rects);
  for(const r of first.rects){assert.ok(Number.isFinite(r.x)&&Number.isFinite(r.y));assert.ok(r.w>0&&r.h>0);assert.match(r.color,/^#[a-f0-9]{6}$/);}
  const svg=sceneSvg(first);assert.ok(svg.includes('shape-rendering="crispEdges"'));assert.ok(!/script|foreignObject|https?:\/\//.test(svg.replace("http://www.w3.org/2000/svg","")));
});
test("offline illustrated album escapes all user text and sharing omits private reflections",()=>{
  const life=lifetime(),t=translator("en"),settings=normalizeFilmSettings({title:'<img src=x onerror="evil()">',words:"<script>secret</script>",captions:{[life.events[0].id]:"<iframe>"}},life);
  const html=albumDocument(life,"en",t,settings);
  assert.ok(html.includes("<svg"));assert.ok(html.includes("&lt;script&gt;secret&lt;/script&gt;"));assert.ok(!html.includes("<script>"));assert.ok(!html.includes("<img src=x"));
  assert.ok(html.includes(t("print")));assert.ok(!shareText(life,"en",t).includes("alert(1)"));assert.ok(!shareText(life,"en",t).includes("cause.cause"));
});
test("historical home scenes exclude relatives who died before that scene",()=>{
 const life=lifetime();life.family.partner={id:"p",name:"P",sex:"F",country:life.country.id,age:30,birthYear:life.birthYear,alive:false,deathAge:30,job:"service"};life.family.marriageAge=20;
 life.family.children=[{id:"c",name:"C",sex:"M",country:life.country.id,age:0,birthYear:life.birthYear+25,alive:false,deathAge:0,job:"none"}];
 const e={...life.events[0],age:40,year:life.birthYear+40,key:"event.home"};const scene=pixelScene(life,e,"home");
 const empty=structuredClone(life);empty.family.partner=null;empty.family.children=[];assert.deepEqual(scene,pixelScene(empty,e,"home"));
});
