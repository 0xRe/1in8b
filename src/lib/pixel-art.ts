import type { GameEvent, Life } from "../game/types";
import { hairTone, skinTone } from "./portrait";

export const SCENE_KINDS=["nursery","school","home","city","work","farm","wedding","park","beach","travel","hospital","memorial"] as const;
export type SceneKind=typeof SCENE_KINDS[number];
export type SceneSubject=Pick<Life,"seed"|"age"|"sex"|"birthYear"|"alive"|"residence"|"pets"> & {stats:Pick<Life["stats"],"job">;family:Pick<Life["family"],"partner"|"marriageAge"|"children">;pendingDecision?:{key:string}|null;descendants?:{grandchildren:Pick<Life["descendants"]["grandchildren"][number],"id"|"birthYear"|"deathAge"|"sex">[]}};
export type PixelRect = { x: number; y: number; w: number; h: number; color: string };
export type PixelScene = { kind: SceneKind; age: number; label: string; rects: PixelRect[] };
const hash = (s: string) => [...s].reduce((n, c) => (Math.imul(n, 31) + c.charCodeAt(0)) >>> 0, 7);

export function sceneKind(life: SceneSubject, event?: GameEvent): SceneKind {
  const age = event?.age ?? life.age;
  const key = event?.key ?? life.pendingDecision?.key ?? "";
  if (/healthRecovered/.test(key)) return "home";
  if (/icu|hospital|critical|illness|treatment|neonatal|health/i.test(key)) return "hospital";
  if (/death|funeral|goodbye/.test(key) || (!event && !life.alive)) return "memorial";
  if (/marri|wedding/.test(key)) return "wedding";
  // The year itself, not only a pending choice, shows life's big days: a spouse's grave in the year
  // they die, the wedding in the year of
  // the marriage, and the nursery with the new baby in the year a child is born.
  if (!event && !key) {
    const mate = life.family.partner;
    if (mate && mate.deathAge !== null && mate.birthYear + mate.deathAge === life.birthYear + age) return "memorial";
    if (mate && life.family.marriageAge === age) return "wedding";
    if (age >= 16 && life.family.children.some((ch) => ch.birthYear === life.birthYear + age)) return "nursery";
  }
  if (/migrat|travel|moveAbroad/.test(key)) return "travel";
  if (/holiday|trip|vacation/.test(key)) return "beach";
  if (age < 3) return "nursery";
  if (/school|study|university|education/.test(key) || age < 17) return "school";
  if (/career|job|work|training/.test(key)) return life.stats.job === "farmer" ? "farm" : "work";
  if (/family|child|partner|home/.test(key)) return "home";
  if (/pet|hobby|friend|nature|retire/.test(key) || age > 64) return "park";
  return life.residence === "urban" ? "city" : "farm";
}

/* ---------- colour ---------- */
type Rgb = number;
const W = 320, H = 180;
const c = (h: string): Rgb => parseInt(h.slice(1), 16);
const hex = (v: Rgb) => `#${v.toString(16).padStart(6, "0")}`;
const mix = (a: Rgb, b: Rgb, t: number): Rgb => {
  const k = Math.max(0, Math.min(1, t));
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * k);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};
// Shadows shift toward a cool violet and highlights toward warm light, as in hand-shaded pixel art.
const SHADOW = c("#2a2340"), LIGHT = c("#fff4dc");
const dark = (v: Rgb, t: number) => mix(v, SHADOW, t);
const lite = (v: Rgb, t: number) => mix(v, LIGHT, t);

/* ---------- painter: a real pixel buffer, flattened to rectangles at the end ---------- */
class Painter {
  px = new Int32Array(W * H).fill(-1);
  private layer: Map<number, Rgb> | null = null;
  private put(i: number, v: Rgb) { if (this.layer) this.layer.set(i, v); else this.px[i] = v; }
  set(x: number, y: number, v: Rgb) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    this.put(y * W + x, v);
  }
  get(x: number, y: number) { return this.px[Math.round(y) * W + Math.round(x)]; }
  rect(x: number, y: number, w: number, h: number, v: Rgb) {
    x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, v);
  }
  ellipse(cx: number, cy: number, rx: number, ry: number, v: Rgb) {
    const r2 = Math.max(0.5, ry);
    for (let dy = -Math.ceil(ry); dy <= Math.ceil(ry); dy++) {
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - (dy * dy) / (r2 * r2))));
      if (half <= 0 && Math.abs(dy) >= ry) continue;
      this.rect(cx - half, cy + dy, half * 2 + 1, 1, v);
    }
  }
  /** Tints already-painted pixels (light patches, ground shadows). */
  tint(x: number, y: number, w: number, h: number, f: (v: Rgb) => Rgb, inside: (x: number, y: number) => boolean = () => true) {
    for (let j = Math.max(0, Math.round(y)); j < Math.min(H, Math.round(y + h)); j++)
      for (let i = Math.max(0, Math.round(x)); i < Math.min(W, Math.round(x + w)); i++)
        if (inside(i, j) && this.px[j * W + i] >= 0) this.px[j * W + i] = f(this.px[j * W + i]);
  }
  /** Draws a group, then rings it with a darker outline of its own colours. */
  sprite(draw: () => void, outline = true) {
    const prev = this.layer, own = new Map<number, Rgb>();
    this.layer = own; draw(); this.layer = prev;
    if (outline) {
      const edge = new Map<number, Rgb>();
      for (const [i, v] of own) {
        const x = i % W, y = (i / W) | 0;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
          const j = ny * W + nx;
          if (!own.has(j) && !edge.has(j)) edge.set(j, dark(v, 0.58));
        }
      }
      for (const [i, v] of edge) this.put(i, v);
    }
    for (const [i, v] of own) this.put(i, v);
  }
  rects(): PixelRect[] {
    const out: PixelRect[] = [];
    let prev = new Map<string, PixelRect>();
    for (let y = 0; y < H; y++) {
      const cur = new Map<string, PixelRect>();
      for (let x = 0; x < W;) {
        const v = this.px[y * W + x];
        let e = x + 1;
        while (e < W && this.px[y * W + e] === v) e++;
        if (v >= 0) {
          const key = `${x},${e - x},${v}`, above = prev.get(key);
          if (above) { above.h++; cur.set(key, above); }
          else { const r = { x, y, w: e - x, h: 1, color: hex(v) }; out.push(r); cur.set(key, r); }
        }
        x = e;
      }
      prev = cur;
    }
    return out;
  }
}

/* ---------- light by stage of life ---------- */
type Light = { sky: Rgb[]; sun: Rgb | null; sunX: number; sunY: number; cloud: Rgb; far: Rgb; hill: Rgb; grass: Rgb; leaf: Rgb; window: Rgb; dusk: boolean };
function lightFor(age: number, kind: SceneKind): Light {
  if (kind === "memorial") return { sky: [c("#36406b"), c("#5c5f8f"), c("#a1849f"), c("#dcae9a")], sun: null, sunX: 64, sunY: 30, cloud: c("#8e86a6"), far: c("#5b5f86"), hill: c("#46586a"), grass: c("#566d55"), leaf: c("#4c6a55"), window: c("#f2c98a"), dusk: true };
  if (age >= 65) return { sky: [c("#6676a8"), c("#a88eb0"), c("#eaa98c"), c("#f6d6a2")], sun: c("#ffd28e"), sunX: 238, sunY: 70, cloud: c("#f1c5b0"), far: c("#9c8ea9"), hill: c("#7c8571"), grass: c("#8a9a5e"), leaf: c("#6f8a57"), window: c("#f6c784"), dusk: false };
  if (age >= 45) return { sky: [c("#82acd0"), c("#b5cfd8"), c("#e9dfc0"), c("#f4e2bb")], sun: c("#ffe6a6"), sunX: 246, sunY: 40, cloud: c("#fbf1df"), far: c("#a9bdb6"), hill: c("#86a079"), grass: c("#90aa5f"), leaf: c("#678e57"), window: c("#f8e0a6"), dusk: false };
  if (age >= 13) return { sky: [c("#6ba8d6"), c("#93c3df"), c("#c3e0e5"), c("#e2efe8")], sun: c("#fff4cc"), sunX: 252, sunY: 26, cloud: c("#ffffff"), far: c("#98bcbe"), hill: c("#73a07a"), grass: c("#84b05f"), leaf: c("#5f9356"), window: c("#d9eef0"), dusk: false };
  return { sky: [c("#87c3e0"), c("#acd7e6"), c("#d3eaea"), c("#ecf4e6")], sun: c("#fff6d2"), sunX: 262, sunY: 28, cloud: c("#ffffff"), far: c("#a6c8c2"), hill: c("#7db07f"), grass: c("#8cba66"), leaf: c("#65a05b"), window: c("#e0f1ef"), dusk: false };
}
const ramp = (stops: Rgb[], t: number) => {
  const p = Math.max(0, Math.min(0.9999, t)) * (stops.length - 1), i = Math.floor(p);
  return mix(stops[i], stops[i + 1], p - i);
};

const SHIRT = ["#4f8a8b", "#b25e6d", "#5f78b0", "#d39a4c", "#6f9150", "#8d6bb0", "#c9705a", "#3f6f86"].map(c);
const PANTS = ["#3d4a63", "#4e5a4a", "#6b5546", "#2f3542", "#5b6b7a"].map(c);

type PersonLook = { seed: number; age: number; sex: string; outfit?: "dress" | "suit" | "gown"; skinSeed?: number };

export function pixelScene(life: SceneSubject, event?: GameEvent, override?: SceneKind, time = 0): PixelScene {
  const kind = override ?? sceneKind(life, event), age = event?.age ?? life.age;
  const p = new Painter(), L = lightFor(age, kind);
  const rand = (i: number) => ((Math.imul(life.seed + i * 733, 1664525) >>> 0) % 1000) / 1000;
  const indoor = ["nursery", "school", "home", "work", "hospital"].includes(kind);

  /* ----- people: drawn at twice the scenery's pixel size so faces and poses read clearly ----- */
  const K = 2;
  const person = (x: number, feet: number, look: PersonLook, pose: "stand" | "sit" = "stand") => {
    // Mix the seed so similar ids (siblings c1, c2, c3) still get distinct looks.
    const s = (Math.imul((look.seed >>> 0) ^ 0x9e3779b9, 2654435761) ^ (look.seed >>> 7)) >>> 0, a = look.age;
    const skin = c(skinTone(look.skinSeed ?? look.seed)), hair = a > 66 ? c("#dcd6ca") : a > 52 ? c("#8f877c") : c(hairTone(look.seed));
    const shirt = look.outfit === "suit" ? c("#2f3546") : look.outfit === "gown" ? c("#f7f1e6") : SHIRT[(s >>> 5) % SHIRT.length];
    const pants = look.outfit === "suit" ? c("#262b38") : PANTS[(s >>> 7) % PANTS.length];
    const shoe = c("#3a2f2c"), eye = c("#2b2230"), blush = mix(skin, c("#e58a8a"), 0.4), mouth = dark(skin, 0.35);
    const dressed = look.outfit === "gown" || look.outfit === "dress" || (look.sex === "F" && a >= 13 && (s >>> 9) % 2 === 0 && !look.outfit);
    const child = a < 13, teen = a < 16 && !child;
    const rows = child ? 23 : teen ? 30 : 32, sitDrop = pose === "sit" ? 0 : 0;
    const top = feet - (rows + sitDrop) * K, ox = Math.round(x - (child ? 5 : 6) * K);
    const P = (dx: number, dy: number, w: number, hh: number, v: Rgb) => p.rect(ox + dx * K, top + dy * K, w * K, hh * K, v);
    const floor = p.get(x, Math.min(H - 1, feet + 1));
    p.ellipse(x, feet + 1, child ? 9 : 12, 2, dark(floor >= 0 ? floor : L.grass, 0.22));
    const lum = (v: Rgb) => ((v >> 16) & 255) * 0.3 + ((v >> 8) & 255) * 0.59 + (v & 255) * 0.11;
    // Hair close in tone to the skin reads as one dark block, so such pairs are pushed apart.
    const locks = Math.abs(lum(hair) - lum(skin)) < 36 ? mix(hair, c("#0d0a0c"), 0.6) : hair;
    p.sprite(() => {
      if (child) {
        // Raw single-pixel helper for detail finer than the 2x body blocks.
        const D = (dx: number, dy: number, v: Rgb) => p.rect(ox + dx, top + dy, 1, 1, v);
        const kid = (s >>> 6) % (look.sex === "F" ? 3 : 2), tie = [c("#e4566b"), c("#f2c14e"), c("#5fa8d3")][(s >>> 8) % 3];
        if (look.sex === "F" && kid === 2) { P(0, 2, 1, 7, dark(locks, 0.1)); P(9, 2, 1, 7, dark(locks, 0.15)); }
        // Rounded face.
        P(2, 1, 6, 8, skin); P(1, 2, 8, 6, skin); P(8, 3, 1, 4, dark(skin, 0.12));
        // Hair cap with a soft, uneven fringe.
        P(2, 0, 6, 1, locks); P(1, 1, 8, 1, locks); P(1, 2, 1, 2, locks); P(8, 2, 1, 2, dark(locks, 0.1));
        for (let x = 4; x < 16; x++) D(x, 4 + ((x + s) % 3 === 0 ? 1 : 0), locks);
        D(5, 1, lite(locks, 0.25)); D(6, 1, lite(locks, 0.25));
        if (look.sex !== "F" && kid === 1) for (let x = 3; x < 18; x += 3) { D(x, -1, locks); D(x + 1, -1, locks); }
        if (look.sex !== "F" && kid === 0) { D(12, -1, locks); D(13, -2, locks); }
        if (look.sex === "F" && kid === 0) { P(-1, 3, 2, 3, locks); P(9, 3, 2, 3, dark(locks, 0.08)); D(-1, 5, tie); D(0, 5, tie); D(19, 5, tie); D(20, 5, tie); }
        if (look.sex === "F" && kid === 1) { P(7, -1, 3, 2, locks); D(16, 1, tie); D(17, 1, tie); }
        // Eyes with catchlights, rosy cheeks, a small smile.
        P(3, 4, 1, 2, eye); P(6, 4, 1, 2, eye); D(6, 8, c("#ffffff")); D(12, 8, c("#ffffff"));
        D(4, 12, blush); D(5, 12, blush); D(14, 12, blush); D(15, 12, blush);
        D(8, 14, mouth); D(9, 15, mouth); D(10, 15, mouth); D(11, 14, mouth);
        // Shirt with a stripe, arms, shorts or skirt, shoes.
        P(1, 9, 8, 7, shirt); P(7, 9, 2, 7, dark(shirt, 0.18)); P(2, 9, 1, 7, lite(shirt, 0.12)); P(1, 12, 8, 1, lite(shirt, 0.4)); P(7, 12, 2, 1, lite(shirt, 0.25));
        P(0, 10, 1, 5, shirt); P(9, 10, 1, 5, dark(shirt, 0.18)); P(0, 15, 1, 1, skin); P(9, 15, 1, 1, skin);
        if (pose === "sit") { P(2, 16, 6, 2, pants); P(2, 18, 2, 3, skin); P(6, 18, 2, 3, dark(skin, 0.1)); }
        else if (look.sex === "F" && (s >>> 9) % 2 === 0) { P(1, 16, 8, 2, shirt); P(0, 18, 10, 1, shirt); P(2, 19, 2, 2, skin); P(6, 19, 2, 2, dark(skin, 0.1)); }
        else { P(2, 16, 6, 2, pants); P(2, 18, 2, 3, skin); P(6, 18, 2, 3, dark(skin, 0.1)); }
        P(1, 21, 3, 2, shoe); P(6, 21, 3, 2, shoe); D(3, 42, lite(shoe, 0.3)); D(13, 42, lite(shoe, 0.3));
        return;
      }
      const legTop = teen ? 19 : 21, legLen = 7;
      const D = (dx: number, dy: number, v: Rgb) => p.rect(ox + dx, top + dy, 1, 1, v);
      const long = look.sex === "F" && (s >>> 2) % 3 !== 0, style = (s >>> 4) % 3;
      if (long) {
        P(1, 3, 10, 9, dark(locks, 0.14)); P(2, 12, 8, 1, dark(locks, 0.14));
        // Strands and a ragged tip keep long hair from reading as a solid hood.
        for (let y = 7; y < 25; y += 3) { D(3, y, dark(locks, 0.34)); D(20, y + 1, dark(locks, 0.34)); }
        for (let y = 8; y < 24; y += 5) { D(2, y, lite(locks, 0.22)); D(21, y + 2, lite(locks, 0.18)); }
        D(3, 26, dark(locks, 0.14)); D(20, 26, dark(locks, 0.14));
      }
      // Rounded face with a narrower jaw.
      P(3, 1, 6, 1, skin); P(2, 2, 8, 7, skin); P(3, 9, 6, 1, skin); P(9, 3, 1, 5, dark(skin, 0.1)); D(16, 18, dark(skin, 0.12)); D(17, 17, dark(skin, 0.12));
      // Hair cap, sides and a fringe drawn at single-pixel detail.
      P(3, 0, 6, 1, locks); P(2, 1, 8, 1, locks); P(2, 2, 1, long ? 4 : 2, locks); P(9, 2, 1, long ? 4 : 2, dark(locks, 0.1));
      for (let fx = 5; fx < 19; fx++) {
        D(fx, 4, locks);
        if (style === 0 ? fx < 12 : style === 1 ? (fx + s) % 3 === 0 : fx < 8 || fx > 15) D(fx, 5, locks);
      }
      if (look.sex !== "F" && style === 1 && a < 50) for (let fx = 6; fx < 18; fx += 3) D(fx, -1, locks);
      D(7, 1, lite(locks, 0.3)); D(8, 1, lite(locks, 0.3)); D(9, 2, lite(locks, 0.22));
      // Brows, eyes with catchlights, cheeks, nose and a small smile.
      const brow = dark(locks, 0.1), white = c("#ffffff");
      for (const ex of [8, 14]) {
        D(ex, 8, brow); D(ex + 1, 8, brow);
        D(ex, 10, white); D(ex + 1, 10, eye); D(ex, 11, eye); D(ex + 1, 11, eye); D(ex, 12, eye); D(ex + 1, 12, eye);
      }
      D(6, 14, blush); D(7, 14, blush); D(16, 14, blush); D(17, 14, blush); D(12, 13, dark(skin, 0.2));
      if (look.sex !== "F" && a >= 25 && (s >>> 10) % 4 === 0) { P(3, 8, 1, 1, locks); P(8, 8, 1, 1, locks); P(3, 9, 6, 1, locks); for (let fx = 9; fx < 15; fx++) D(fx, 15, locks); }
      D(10, 16, mouth); D(11, 17, mouth); D(12, 17, mouth); D(13, 16, mouth);
      if (a > 55 && (s >>> 3) % 2) {
        const rim = lum(skin) < 110 ? c("#d9bb7c") : c("#5b5048");
        for (const ex of [8, 14]) { for (let gx = ex - 1; gx < ex + 3; gx++) { D(gx, 9, rim); D(gx, 13, rim); } for (let gy = 10; gy < 13; gy++) { D(ex - 1, gy, rim); D(ex + 2, gy, rim); } }
        D(11, 10, rim); D(12, 10, rim);
      }
      P(5, 10, 2, 1, dark(skin, 0.2));
      const torso = legTop - 11;
      P(1, 11, 10, torso, shirt); P(9, 11, 2, torso, dark(shirt, 0.2)); P(2, 11, 1, torso, lite(shirt, 0.14)); P(4, 11, 4, 1, lite(shirt, 0.25));
      if (look.outfit === "suit") { P(5, 11, 2, 5, c("#f2efe6")); P(5, 12, 2, 2, c("#a5343f")); }
      P(0, 12, 1, torso - 2, shirt); P(11, 12, 1, torso - 2, dark(shirt, 0.2)); P(0, legTop - 1, 1, 2, skin); P(11, legTop - 1, 1, 2, skin);
      if (look.outfit === "gown") { P(1, legTop, 10, 4, shirt); P(0, legTop + 4, 12, legLen - 2, shirt); P(9, legTop, 3, legLen + 2, dark(shirt, 0.12)); P(1, legTop + legLen + 1, 3, 1, shoe); P(8, legTop + legLen + 1, 3, 1, shoe); P(4, 13, 4, 3, c("#e6a3b2")); }
      else {
        if (dressed && pose === "stand") {
          P(1, legTop, 10, 3, shirt); P(0, legTop + 3, 12, 2, shirt); P(9, legTop, 3, 5, dark(shirt, 0.18));
          P(3, legTop + 5, 2, legLen - 5, skin); P(7, legTop + 5, 2, legLen - 5, dark(skin, 0.1));
        } else if (pose === "sit") {
          P(2, legTop, 8, 3, dressed ? shirt : pants); P(2, legTop + 3, 3, legLen - 3, dressed ? skin : pants); P(7, legTop + 3, 3, legLen - 3, dark(dressed ? skin : pants, 0.15));
        } else {
          P(2, legTop, 8, 2, pants); P(2, legTop + 2, 3, legLen - 2, pants); P(7, legTop + 2, 3, legLen - 2, dark(pants, 0.15));
        }
        P(1, legTop + legLen, 4, 2, shoe); P(7, legTop + legLen, 4, 2, shoe);
      }
      if (a > 74 && pose === "stand") { P(12, 15, 1, rows - 15, c("#7a5a3e")); P(11, 15, 2, 1, c("#7a5a3e")); }
    });
  };
  const pet = (x: number, feet: number, kindOf: string) => {
    const fur = kindOf === "cat" ? c("#9d7a5c") : kindOf === "dog" ? c("#c49a68") : c("#b7a58a");
    const floor = p.get(x + 12, Math.min(H - 1, feet + 1));
    p.ellipse(x + 12, feet + 1, 14, 2, dark(floor >= 0 ? floor : L.grass, 0.2));
    const Q = (dx: number, dy: number, w: number, hh: number, v: Rgb) => p.rect(x + dx * K, feet + dy * K, w * K, hh * K, v);
    p.sprite(() => {
      Q(0, -8, 12, 5, fur); Q(0, -8, 12, 1, lite(fur, 0.2)); Q(1, -3, 2, 3, dark(fur, 0.15)); Q(9, -3, 2, 3, dark(fur, 0.15)); Q(4, -3, 2, 3, dark(fur, 0.25));
      Q(9, -13, 7, 6, fur); Q(9, -13, 7, 1, lite(fur, 0.2)); Q(13, -11, 1, 1, c("#2b2230")); Q(15, -9, 1, 1, dark(fur, 0.55)); Q(12, -8, 3, 1, lite(fur, 0.25));
      if (kindOf === "cat") { Q(9, -15, 2, 2, fur); Q(14, -15, 2, 2, fur); Q(-2, -14, 2, 7, fur); }
      else { Q(9, -13, 2, 5, dark(fur, 0.25)); Q(-3, -9 + (Math.floor(time * 4) % 2), 3, 2, fur); }
    });
  };

  /* ----- props ----- */
  const shadowOnGround = (cx: number, cy: number, rx: number) => p.tint(cx - rx, cy - 3, rx * 2 + 1, 7, (v) => dark(v, 0.16), (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / 3) ** 2 <= 1);
  /** Leaf masses: a shadow mass, the body, then a lit crescent on the upper left of each cluster. */
  const canopy = (blobs: [number, number, number][], leaf: Rgb) => {
    for (const [x, y, r] of blobs) p.ellipse(x + 1, y + 2, r, r * 0.88, dark(leaf, 0.3));
    for (const [x, y, r] of blobs) p.ellipse(x - 1, y - 1, r * 0.9, r * 0.8, leaf);
    for (const [x, y, r] of blobs) { p.ellipse(x - r * 0.28, y - r * 0.32, r * 0.58, r * 0.46, lite(leaf, 0.2)); p.ellipse(x - r * 0.12, y - r * 0.1, r * 0.56, r * 0.46, leaf); }
    blobs.forEach(([x, y, r], b) => { for (let i = 0; i < r * 0.8; i++) { const ax = x + (rand(b * 31 + i) - 0.5) * r * 1.4, ay = y + (rand(b * 37 + i + 5) - 0.3) * r; p.rect(ax, ay, 2, 1, dark(leaf, 0.14)); } });
  };
  const tree = (x: number, base: number, size: number, leaf = L.leaf) => {
    shadowOnGround(x + 4, base, size * 1.05);
    p.sprite(() => {
      const trunk = c("#7b5b42"), tw = Math.max(4, Math.round(size / 6));
      p.rect(x - tw / 2, base - size * 1.25, tw, size * 1.25, trunk); p.rect(x - tw / 2, base - size * 1.25, 1, size * 1.25, lite(trunk, 0.2)); p.rect(x + tw / 2 - 2, base - size * 1.25, 2, size * 1.25, dark(trunk, 0.28));
      p.rect(x - tw / 2 - 2, base - 3, 2, 3, trunk); p.rect(x + tw / 2, base - 3, 2, 3, dark(trunk, 0.2));
      p.rect(x - 1, base - size * 1.1, 1, 3, dark(trunk, 0.35));
      canopy([[x, base - size * 1.8, size * 0.62], [x - size * 0.55, base - size * 1.4, size * 0.5], [x + size * 0.56, base - size * 1.36, size * 0.52], [x + size * 0.05, base - size * 1.2, size * 0.58], [x - size * 0.22, base - size * 2.12, size * 0.4]], leaf);
    });
  };
  const bush = (x: number, base: number, size: number) => p.sprite(() => canopy([[x, base - size * 0.6, size * 0.7], [x - size * 0.75, base - size * 0.45, size * 0.55], [x + size * 0.75, base - size * 0.45, size * 0.58]], lite(L.leaf, 0.05)));
  const pine = (x: number, base: number, size: number) => {
    shadowOnGround(x + 3, base, size * 0.6);
    p.sprite(() => {
      p.rect(x - 2, base - 6, 4, 6, c("#6d4f3a"));
      for (let i = 0; i < 4; i++) {
        const y = base - 5 - i * size * 0.42, w = size * (0.62 - i * 0.12), hgt = size * 0.6;
        for (let r = 0; r < hgt; r++) {
          const half = Math.round((w * r) / hgt);
          p.rect(x - half, y - hgt + r, half * 2 + 1, 1, dark(L.leaf, 0.22));
          p.rect(x - half, y - hgt + r, Math.max(1, half), 1, lite(L.leaf, 0.04));
        }
      }
    });
  };
  const flower = (x: number, y: number, i: number) => {
    const petals = [c("#f3b4c2"), c("#f7e3a0"), c("#fbf7ef"), c("#d6a3e0"), c("#f2a483")];
    p.rect(x, y, 1, 4, dark(L.grass, 0.25)); const v = petals[i % petals.length];
    p.set(x, y - 1, v); p.set(x - 1, y, v); p.set(x + 1, y, v); p.set(x, y + 1, dark(v, 0.15)); p.set(x, y, c("#f6d36b"));
  };
  const tuft = (x: number, y: number) => { const g = lite(L.grass, 0.18), d = dark(L.grass, 0.12); p.set(x, y, g); p.set(x + 1, y - 1, g); p.set(x + 2, y, g); p.set(x + 1, y + 1, d); };
  const cloud = (x: number, y: number, s: number) => p.sprite(() => {
    const shade = mix(L.cloud, L.sky[2], 0.45);
    p.ellipse(x, y + 1, 7 * s, 3 * s, shade); p.ellipse(x + 8 * s, y - 1, 7 * s, 4 * s, shade); p.ellipse(x + 15 * s, y + 1, 6 * s, 3 * s, shade);
    p.ellipse(x, y, 7 * s, 2.5 * s, L.cloud); p.ellipse(x + 8 * s, y - 2, 6.5 * s, 3.5 * s, L.cloud); p.ellipse(x + 15 * s, y, 5.5 * s, 2.5 * s, L.cloud);
  }, false);
  /** A park bench sized for the 2× figures; the seat sits at a seated person's hip line. */
  const bench = (x: number, feet: number, w = 92) => p.sprite(() => {
    const wood = c("#a57650"), iron = c("#3d3a40");
    for (let i = 0; i < 3; i++) { p.rect(x, feet - 52 + i * 8, w, 5, i === 0 ? lite(wood, 0.1) : wood); p.rect(x, feet - 48 + i * 8, w, 1, dark(wood, 0.2)); }
    p.rect(x + 6, feet - 52, 3, 26, iron); p.rect(x + w - 9, feet - 52, 3, 26, iron);
    p.rect(x - 3, feet - 24, w + 6, 4, lite(wood, 0.12)); p.rect(x - 3, feet - 20, w + 6, 3, dark(wood, 0.25));
    p.rect(x + 3, feet - 17, 4, 17, iron); p.rect(x + w - 7, feet - 17, 4, 17, iron); p.rect(x - 5, feet - 32, 3, 15, iron); p.rect(x + w + 2, feet - 32, 3, 15, iron); p.rect(x - 6, feet - 33, 6, 2, iron); p.rect(x + w, feet - 33, 6, 2, iron);
  });
  const birds = () => { for (let i = 0; i < 3; i++) { const bx = (60 + i * 21 + time * 8) % 340 - 10, by = 30 + i * 6 + Math.round(Math.sin(time * 2 + i)), wing = Math.floor(time * 4 + i) % 2; const v = dark(L.sky[0], 0.55); p.set(bx, by, v); p.set(bx - 1, by - 1 + wing, v); p.set(bx + 1, by - 1 + wing, v); p.set(bx - 2, by - wing, v); p.set(bx + 2, by - wing, v); } };

  /* ----- backdrops ----- */
  const sky = (bottom: number) => {
    const bands = 11;
    for (let y = 0; y < bottom; y++) p.rect(0, y, W, 1, ramp(L.sky, Math.floor((y / bottom) * bands) / (bands - 1)));
    if (L.dusk) {
      for (let i = 0; i < 26; i++) { const sx = Math.floor(rand(i + 40) * W), sy = Math.floor(rand(i + 80) * bottom * 0.55); p.set(sx, sy, (Math.floor(time * 2) + i) % 7 === 0 ? c("#ffffff") : c("#cfd2ea")); }
      p.ellipse(L.sunX, L.sunY, 9, 9, mix(L.sky[0], c("#f3ead2"), 0.18)); p.ellipse(L.sunX, L.sunY, 6, 6, c("#f3ead2")); p.ellipse(L.sunX + 3, L.sunY - 2, 5, 5, mix(L.sky[0], c("#f3ead2"), 0.18));
    } else if (L.sun) {
      const behind = ramp(L.sky, L.sunY / bottom);
      p.ellipse(L.sunX, L.sunY, 20, 20, mix(behind, L.sun, 0.22)); p.ellipse(L.sunX, L.sunY, 14, 14, mix(behind, L.sun, 0.45));
      p.ellipse(L.sunX, L.sunY, 9, 9, L.sun); p.ellipse(L.sunX - 3, L.sunY - 3, 3, 3, lite(L.sun, 0.5));
    }
    if (!L.dusk) for (let i = 0; i < 4; i++) cloud(((i * 91 + Math.floor(time * 3) + Math.floor(rand(i) * 40)) % 380) - 30, 14 + (i % 3) * 12 + Math.floor(rand(i + 3) * 6), i % 2 ? 0.8 : 1.1);
  };
  const ridge = (v: Rgb, base: number, amp: number, freq: number, phase: number, bottom: number) => {
    for (let x = 0; x < W; x++) {
      const top = Math.round(base - Math.sin(x * freq + phase) * amp - Math.sin(x * freq * 2.7 + phase * 1.9) * amp * 0.35);
      p.rect(x, top, 1, bottom - top, v);
    }
  };
  const treeline = (v: Rgb, base: number, bottom: number) => {
    for (let x = -6; x < W + 6; x += 9) { const r = 5 + Math.floor(rand(x + 7) * 5); p.ellipse(x, base - r * 0.4, r, r, v); p.ellipse(x - 2, base - r * 0.4 - 2, r * 0.5, r * 0.4, lite(v, 0.06)); }
    p.rect(0, base, W, bottom - base, v);
  };
  const outdoors = (horizon = 104) => {
    sky(horizon);
    ridge(mix(L.far, L.sky[L.sky.length - 1], 0.4), horizon - 26, 9, 0.021, rand(1) * 6, horizon);
    ridge(L.far, horizon - 15, 7, 0.034, rand(2) * 6, horizon);
    treeline(mix(L.hill, L.far, 0.35), horizon - 4, horizon + 1);
    const bands = 6;
    for (let y = horizon; y < H; y++) p.rect(0, y, W, 1, mix(lite(L.grass, 0.1), dark(L.grass, 0.16), Math.floor(((y - horizon) / (H - horizon)) * bands) / (bands - 1)));
    for (let i = 0; i < 90; i++) tuft(Math.floor(rand(i + 100) * W), horizon + 4 + Math.floor(rand(i + 200) * (H - horizon - 6)));
  };
  const path = (y: number, h = 18) => {
    const dirt = c("#cdb48f");
    p.rect(0, y, W, h, dirt); p.rect(0, y, W, 1, dark(L.grass, 0.2)); p.rect(0, y + 1, W, 2, lite(dirt, 0.18)); p.rect(0, y + h - 1, W, 1, dark(dirt, 0.22));
    for (let i = 0; i < 30; i++) { const sx = Math.floor(rand(i + 300) * W), sy = y + 4 + Math.floor(rand(i + 330) * (h - 7)); p.rect(sx, sy, 3, 1, dark(dirt, 0.15)); p.rect(sx, sy - 1, 2, 1, lite(dirt, 0.2)); }
  };
  const room = (wall: Rgb, floorTop = 118, tiles = false) => {
    p.rect(0, 0, W, floorTop, wall);
    p.tint(0, 0, 150, floorTop, (v) => lite(v, 0.07)); p.tint(150, 0, 60, floorTop, (v) => lite(v, 0.03));
    for (let y = 8; y < 76; y += 12) for (let x = (y / 12) % 2 ? 7 : 0; x < W; x += 14) p.set(x, y, dark(p.get(x, y), 0.07));
    p.rect(0, 80, W, floorTop - 86, dark(wall, 0.06)); p.rect(0, 79, W, 2, lite(wall, 0.18)); p.rect(0, 81, W, 1, dark(wall, 0.16));
    for (let x = 6; x < W; x += 44) { p.rect(x, 86, 34, 1, dark(wall, 0.14)); p.rect(x, 87, 1, floorTop - 96, dark(wall, 0.14)); p.rect(x, floorTop - 9, 34, 1, lite(wall, 0.12)); p.rect(x + 34, 87, 1, floorTop - 96, lite(wall, 0.12)); }
    const base = c("#8a6a4e"); p.rect(0, floorTop - 6, W, 6, base); p.rect(0, floorTop - 6, W, 1, lite(base, 0.25));
    if (tiles) {
      const t1 = c("#d9dfdc"), t2 = c("#c9d2cf");
      for (let y = floorTop, row = 0; y < H; y += 8 + row * 2, row++) for (let x = -(row * 4); x < W; x += 20 + row * 2) p.rect(x, y, 20 + row * 2, 8 + row * 2, ((Math.floor((x + row * 4) / (20 + row * 2)) + row) % 2) ? t1 : t2);
    } else {
      const wood = c("#b98d62");
      for (let y = floorTop, row = 0; y < H; row++) {
        const hh = 5 + row * 2;
        p.rect(0, y, W, hh, row % 2 ? wood : lite(wood, 0.05)); p.rect(0, y, W, 1, dark(wood, 0.16));
        for (let x = (row * 23) % 46; x < W; x += 46) p.rect(x, y + 1, 1, hh - 1, dark(wood, 0.14));
        y += hh;
      }
    }
    p.tint(0, floorTop, W, H - floorTop, (v) => lite(v, 0.14), (x, y) => x > 22 + (y - floorTop) * 0.6 && x < 98 + (y - floorTop) * 1.1);
  };
  const windowFrame = (x: number, y: number, w: number, h: number) => {
    const frameC = c("#f3ead6"), view = L.dusk ? [c("#3d4776"), c("#9b84a3")] : [L.sky[0], L.sky[L.sky.length - 1]];
    for (let j = 0; j < h; j++) p.rect(x, y + j, w, 1, mix(view[0], view[1], Math.floor((j / h) * 5) / 4));
    if (L.sun) p.ellipse(x + w - 12, y + 10, 5, 5, L.sun);
    for (let i = 0; i < w; i++) { const t = Math.round(y + h - 14 - Math.sin(i * 0.12 + rand(5) * 6) * 4); p.rect(x + i, t, 1, y + h - t, L.far); }
    p.rect(x, y + h - 7, w, 7, L.hill);
    p.sprite(() => {
      p.rect(x - 4, y - 4, w + 8, 4, frameC); p.rect(x - 4, y + h, w + 8, 4, frameC); p.rect(x - 4, y, 4, h, frameC); p.rect(x + w, y, 4, h, frameC);
      p.rect(x + w / 2 - 1, y, 3, h, frameC); p.rect(x, y + h / 2 - 1, w, 3, frameC); p.rect(x - 8, y + h + 4, w + 16, 3, lite(frameC, 0.2));
    });
    p.rect(x + 3, y + 3, 1, 8, c("#ffffff")); p.rect(x + w / 2 + 5, y + 3, 1, 5, c("#ffffff"));
    const cloth = c("#c78d7a");
    p.sprite(() => {
      p.rect(x - 14, y - 10, w + 28, 2, c("#6c5644"));
      for (const cx of [x - 13, x + w + 5]) { p.rect(cx, y - 8, 8, h + 14, cloth); for (let i = 1; i < 8; i += 3) p.rect(cx + i, y - 8, 1, h + 14, dark(cloth, 0.18)); p.rect(cx, y - 8, 1, h + 14, lite(cloth, 0.2)); }
    });
  };
  const frame = (x: number, y: number, w: number, h: number, inner: () => void) => p.sprite(() => { p.rect(x, y, w, h, c("#9a7752")); p.rect(x + 2, y + 2, w - 4, h - 4, c("#efe5cf")); inner(); });
  const plant = (x: number, base: number, s = 1) => p.sprite(() => {
    const pot = c("#c4744f"); p.rect(x - 7 * s, base - 13 * s, 15 * s, 13 * s, pot); p.rect(x - 8 * s, base - 14 * s, 17 * s, 3 * s, lite(pot, 0.15)); p.rect(x + 4 * s, base - 13 * s, 3 * s, 13 * s, dark(pot, 0.2));
    canopy([[x, base - 22 * s, 7 * s], [x - 7 * s, base - 17 * s, 5 * s], [x + 7 * s, base - 18 * s, 5 * s]], L.dusk ? c("#5f8a5c") : c("#5f9356"));
  });
  const clock = (x: number, y: number) => p.sprite(() => { p.ellipse(x, y, 8, 8, c("#8b6f50")); p.ellipse(x, y, 6, 6, c("#f6efdd")); p.rect(x, y - 5, 1, 5, c("#3b3533")); p.rect(x, y, 4, 1, c("#3b3533")); });

  /* ----- scenes ----- */
  const self: PersonLook = { seed: life.seed, age, sex: life.sex };
  let petSpot: [number, number] | null = null;
  // The household at this age: a living spouse after the wedding, and children still at home.
  const year = life.birthYear + age, mate = life.family.partner, alive = (b: number, d: number | null) => b <= year && (d === null || b + d > year);
  const spouse: PersonLook | null = mate && life.family.marriageAge !== null && age >= life.family.marriageAge && alive(mate.birthYear, mate.deathAge) ? { seed: hash(mate.id), age: year - mate.birthYear, sex: mate.sex } : null;
  const children: PersonLook[] = life.family.children.filter((ch) => year - ch.birthYear < 18 && alive(ch.birthYear, ch.deathAge)).slice(0, 2).map((ch, i) => ({ seed: hash(ch.id), age: Math.max(3, year - ch.birthYear), sex: ch.sex, skinSeed: i % 2 && mate ? hash(mate.id) : life.seed }));
  // With the children grown, young grandchildren come along instead.
  const kids = children.length ? children : (life.descendants?.grandchildren ?? []).filter((g) => year - g.birthYear < 13 && alive(g.birthYear, g.deathAge)).slice(0, 2).map((g) => ({ seed: hash(g.id), age: Math.max(3, year - g.birthYear), sex: g.sex, skinSeed: life.seed }));
  // In the year a spouse dies, the living player stands at their grave.
  const mourning = !!mate && mate.deathAge !== null && mate.birthYear + mate.deathAge === year && (life.alive || age < life.age);
  /** Out of the house, the family walks with the player rather than vanishing after the wedding. */
  const family = (mateX: number, feet: number, kidXs: number[], pose: "stand" | "sit" = "stand") => {
    if (spouse) person(mateX, feet, spouse, pose);
    kids.forEach((kid, i) => kidXs[i] !== undefined && person(kidXs[i], feet + 2, kid));
  };
  if (indoor) {
    if (kind === "nursery") {
      // In a parent's nursery the crib holds their newborn; otherwise it is the player as a baby.
      const newborn = age >= 16 ? life.family.children.find((ch) => ch.birthYear === year) : undefined, babySeed = newborn ? hash(newborn.id) : life.seed;
      room(c("#efdccb")); windowFrame(26, 20, 58, 44); frame(250, 22, 34, 26, () => { p.ellipse(267, 35, 7, 6, c("#f2c46f")); });
      p.ellipse(176, 162, 96, 12, c("#c9a6b8")); p.ellipse(176, 162, 88, 10, c("#d7b8c7")); for (let x = 96; x < 260; x += 10) p.set(x, 162, c("#ecd2dd"));
      p.sprite(() => { p.rect(150, 0, 1, 14, c("#8f7b67")); p.rect(122, 14, 58, 1, c("#8f7b67")); const sw = Math.round(Math.sin(time * 1.5) * 2); [c("#f1b6a6"), c("#a7cfd5"), c("#f2d38a"), c("#b9a3d6")].forEach((v, i) => { p.rect(124 + i * 18 + sw, 15, 1, 8 + (i % 2) * 4, c("#8f7b67")); p.ellipse(124 + i * 18 + sw, 26 + (i % 2) * 4, 3, 3, v); p.set(123 + i * 18 + sw, 25 + (i % 2) * 4, lite(v, 0.4)); }); }, false);
      p.sprite(() => {
        const wood = c("#ecd7b2");
        p.rect(96, 76, 112, 5, dark(wood, 0.12)); p.rect(96, 126, 112, 7, wood); p.rect(96, 81, 5, 78, dark(wood, 0.1)); p.rect(203, 81, 5, 78, dark(wood, 0.1));
        p.rect(101, 102, 102, 24, c("#cfe2e4")); p.rect(101, 102, 102, 3, lite(c("#cfe2e4"), 0.3));
        const sk = c(skinTone(life.seed)), tone = c(hairTone(babySeed)), shadeSk = dark(sk, 0.16);
        const lumOf = (v: Rgb) => ((v >> 16) & 255) * 0.3 + ((v >> 8) & 255) * 0.59 + (v & 255) * 0.11, deep = lumOf(sk) < 110;
        const hr = Math.abs(lumOf(tone) - lumOf(sk)) < 36 ? mix(tone, c("#0d0a0c"), 0.6) : tone;
        // A sleeping baby: round head, soft hair with a curl (or a knitted cap), closed eyes, rosy cheeks.
        p.ellipse(126, 105, 11, 10, sk); p.ellipse(120, 109, 4, 3, sk); p.ellipse(132, 109, 4, 3, sk);
        for (let y = 101; y <= 113; y++) { const half = 11 * Math.sqrt(Math.max(0, 1 - ((y - 105) / 10) ** 2)); p.set(126 + Math.floor(half), y, mix(sk, shadeSk, 0.7)); }
        if (babySeed % 3 === 0) { const hat = [c("#f2a7b5"), c("#9fc4e6"), c("#f4d27a")][(babySeed >>> 2) % 3]; p.ellipse(126, 100, 11.5, 7, hat); p.rect(115, 101, 23, 2, lite(hat, 0.25)); for (let x = 117; x <= 135; x += 3) p.rect(x, 95, 1, 6, dark(hat, 0.1)); p.ellipse(126, 92, 2.4, 2.2, lite(hat, 0.35)); }
        else { p.ellipse(126, 98, 8, 3.5, mix(hr, sk, deep ? 0.15 : 0.45)); p.set(126, 94, hr); p.set(127, 93, hr); p.set(128, 94, hr); p.set(127, 95, hr); }
        for (const ex of [119, 129]) { p.set(ex, 106, c("#2b2230")); p.set(ex + 1, 107, c("#2b2230")); p.set(ex + 2, 107, c("#2b2230")); p.set(ex + 3, 106, c("#2b2230")); }
        const cheek = mix(sk, c("#f09a9a"), deep ? 0.55 : 0.42);
        p.rect(117, 109, 3, 1, cheek); p.rect(132, 109, 3, 1, cheek); p.rect(122, 102, 3, 1, lite(sk, deep ? 0.3 : 0.22)); p.set(121, 103, lite(sk, deep ? 0.22 : 0.15));
        p.rect(125, 111, 3, 1, mix(dark(sk, 0.28), c("#d9707c"), 0.5)); p.set(124, 110, mix(dark(sk, 0.28), c("#d9707c"), 0.5)); p.set(128, 110, mix(dark(sk, 0.28), c("#d9707c"), 0.5));
        p.rect(136, 100, 62, 22, c("#f3c6cf")); for (let i = 0; i < 62; i += 8) p.rect(136 + i, 100, 4, 22, c("#f8dbe1")); p.rect(136, 100, 62, 2, lite(c("#f3c6cf"), 0.3));
        // Back slats behind the baby are short; the front rail sits low so the face stays visible.
        for (let x = 104; x < 203; x += 9) { p.rect(x, 81, 3, 12, dark(wood, 0.06)); p.rect(x, 114, 3, 12, wood); }
        p.rect(96, 112, 112, 3, lite(wood, 0.15));
        p.rect(96, 159, 8, 3, dark(wood, 0.3)); p.rect(200, 159, 8, 3, dark(wood, 0.3));
      });
      p.sprite(() => { const bear = c("#b98656"); p.ellipse(56, 158, 11, 10, bear); p.ellipse(56, 140, 9, 8, bear); p.ellipse(49, 133, 3, 3, bear); p.ellipse(63, 133, 3, 3, bear); p.ellipse(56, 144, 4, 2, lite(bear, 0.3)); p.rect(52, 138, 2, 2, c("#2b2230")); p.rect(59, 138, 2, 2, c("#2b2230")); p.rect(46, 152, 4, 8, dark(bear, 0.15)); p.rect(62, 152, 4, 8, dark(bear, 0.15)); });
      if (newborn) { person(262, 172, self); if (spouse) person(234, 172, spouse); }
      else person(262, 172, { seed: life.seed + 1, age: 30, sex: "F", skinSeed: life.seed });
    } else if (kind === "school") {
      // Primary classrooms are warm and decorated; secondary ones are plainer, with a map.
      const young = age <= 10, chalk = c("#d9e4d6");
      room(young ? c("#f0e3c9") : c("#dfe3cf"), 112); clock(292, 22);
      if (young) p.sprite(() => {
        const flags = [c("#e4566b"), c("#f2c14e"), c("#5fa8d3"), c("#7cc28a"), c("#b98ad6")];
        for (let i = 0; i < 14; i++) { const x = 6 + i * 22, sag = Math.round(Math.sin((i / 13) * Math.PI) * 4); p.rect(x, 4 + sag, 22, 1, c("#8f7b67")); for (let r = 0; r < 7; r++) p.rect(x + 4 + r, 5 + sag + r, 14 - 2 * r, 1, flags[i % 5]); }
      }, false);
      p.sprite(() => {
        p.rect(70, 12, 176, 62, c("#9a7752")); p.rect(74, 16, 168, 54, c("#3f6458")); p.rect(74, 16, 168, 2, lite(c("#3f6458"), 0.12)); p.rect(68, 74, 180, 4, c("#b08a60"));
        if (young) {
          const glyphs = [[" ### ", "#   #", "#   #", "#####", "#   #", "#   #", "#   #"], ["#### ", "#   #", "#   #", "#### ", "#   #", "#   #", "#### "], [" ####", "#    ", "#    ", "#    ", "#    ", "#    ", " ####"]];
          glyphs.forEach((g, k) => g.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === "#") p.rect(88 + k * 16 + x * 2, 26 + y * 2, 2, 2, [chalk, c("#f2c4c8"), c("#f2d38a")][k]); })));
          for (let x = 88; x < 150; x += 4) p.rect(x, 50, 2, 1, chalk);
          const sun = c("#f2d38a"); p.ellipse(212, 42, 7, 7, sun); for (let a = 0; a < 8; a++) p.rect(212 + Math.round(Math.cos(a * Math.PI / 4) * 12), 42 + Math.round(Math.sin(a * Math.PI / 4) * 12), 2, 2, sun);
        } else {
          for (let line = 0; line < 4; line++) { let x = 84; const y = 26 + line * 10; while (x < 84 + 50 + rand(line + age * 5) * 70) { const w = 3 + Math.floor(rand(x + line + age) * 8); p.rect(x, y + (x % 3 === 0 ? 1 : 0), w, 1, chalk); x += w + 3; } }
          for (let a = 0; a < 44; a++) p.set(212 + Math.round(Math.cos(a / 7) * 13), 43 + Math.round(Math.sin(a / 7) * 13), chalk); p.rect(206, 42, 13, 1, chalk); p.rect(212, 36, 1, 13, chalk);
        }
        p.rect(88, 75, 8, 2, c("#f3efe2")); p.rect(100, 75, 5, 2, c("#e8b7b0"));
      });
      if (young) frame(256, 40, 46, 34, () => { p.rect(258, 42, 42, 30, c("#fbf6ea")); p.rect(268, 58, 18, 12, c("#e4566b")); for (let r = 0; r < 8; r++) p.rect(276 - r, 50 + r, 2 + 2 * r, 1, c("#8f5a3e")); p.rect(275, 62, 4, 8, c("#5fa8d3")); p.ellipse(293, 47, 3, 3, c("#f2c14e")); p.rect(258, 70, 42, 2, c("#7cc28a")); });
      else frame(256, 40, 46, 34, () => { p.rect(258, 42, 42, 30, c("#a9cfe0")); p.ellipse(268, 52, 6, 5, c("#8fb07a")); p.ellipse(271, 63, 3, 5, c("#8fb07a")); p.ellipse(285, 50, 7, 4, c("#8fb07a")); p.ellipse(289, 60, 4, 4, c("#c9b07a")); p.ellipse(296, 66, 3, 2, c("#8fb07a")); for (let x = 258; x < 300; x += 7) p.rect(x, 42, 1, 30, lite(c("#a9cfe0"), 0.25)); });
      for (let i = 0; i < 3; i++) {
        const x = 62 + i * 98, feet = 172;
        person(x, feet, { seed: life.seed + i * 17, age: Math.min(age, 17), sex: i === 1 ? life.sex : i % 2 ? "F" : "M" });
        p.sprite(() => { const wood = c("#c49a6c"); p.rect(x - 30, 150, 60, 5, lite(wood, 0.12)); p.rect(x - 27, 155, 54, 12, wood); p.rect(x - 27, 155, 54, 1, dark(wood, 0.25)); p.rect(x - 26, 167, 4, 12, dark(wood, 0.3)); p.rect(x + 22, 167, 4, 12, dark(wood, 0.3)); p.rect(x - 16, 145, 18, 5, c("#f4ecd8")); p.rect(x - 7, 145, 1, 5, c("#c9bfa8")); p.rect(x + 8, 144, 10, 6, SHIRT[(i + life.seed) % SHIRT.length]); p.rect(x + 2, 148, 5, 1, c("#e2b35a")); });
      }
    } else if (kind === "hospital") {
      room(c("#dbe8e3"), 116, true); windowFrame(22, 20, 48, 40);
      p.sprite(() => { p.rect(150, 16, 26, 26, c("#f6f1e6")); p.rect(159, 20, 8, 18, c("#c0505a")); p.rect(154, 25, 18, 8, c("#c0505a")); });
      p.sprite(() => { const metal = c("#8ea4a3"); p.rect(96, 30, 2, 134, metal); p.rect(88, 30, 18, 2, metal); p.rect(90, 162, 14, 3, metal); p.rect(90, 34, 14, 22, c("#cfe7ea")); p.rect(90, 44, 14, 12, c("#a9d3d8")); p.rect(96, 56, 1, 54, c("#b8d0d0")); });
      p.sprite(() => {
        const metal = c("#9aa9aa"), sheet = c("#f7f4ec"), blanket = c("#7fb1ac");
        p.rect(110, 82, 5, 82, metal); p.rect(256, 98, 5, 66, metal); p.rect(110, 82, 5, 2, lite(metal, 0.3));
        p.rect(115, 118, 141, 16, sheet); p.rect(115, 134, 141, 6, dark(metal, 0.1)); p.rect(115, 118, 141, 2, lite(sheet, 0.3));
        p.rect(118, 104, 38, 16, c("#ffffff")); p.rect(118, 117, 38, 3, dark(sheet, 0.08));
        // The patient's head is sized for their age; resting eyes, soft cheeks, readable hair.
        const sk = c(skinTone(life.seed)), r = age < 4 ? 7 : age < 13 ? 8.5 : 10.5, hy = 107 - r * 0.15;
        // A reclining patient needs a visible shoulder/neck bridge into the blanket.
        // Draw the gown first so the face and blanket naturally overlap its edges.
        const gown = c("#c6d8e4");
        p.ellipse(149, 118, 19, 9, gown);
        p.rect(135, 110, 8, 9, sk);
        p.ellipse(140, 118, 9, 5, gown);
        p.rect(136, 116, 7, 3, lite(sk, 0.08));
        p.rect(145, 119, 10, 2, dark(gown, 0.12));
        const lumOf = (v: Rgb) => ((v >> 16) & 255) * 0.3 + ((v >> 8) & 255) * 0.59 + (v & 255) * 0.11;
        const tone = age > 62 ? c("#dcd6ca") : c(hairTone(life.seed)), hr = Math.abs(lumOf(tone) - lumOf(sk)) < 36 ? mix(tone, c("#0d0a0c"), 0.6) : tone;
        p.ellipse(136, hy - 2, r + 1, r * 0.82, hr); p.ellipse(136, hy + 1, r * 0.9, r * 0.8, sk); p.ellipse(136 + r * 0.55, hy + 1, r * 0.3, r * 0.6, dark(sk, 0.1));
        p.ellipse(136, hy - r * 0.55, r * 0.75, r * 0.28, hr); p.rect(131, hy - r * 0.75, 4, 1, lite(hr, 0.3));
        const lid = lumOf(sk) < 110 ? mix(sk, c("#0d0a0c"), 0.65) : c("#2b2230");
        p.rect(131, hy + 1, 3, 1, lid); p.rect(139, hy + 1, 3, 1, lid); p.set(130, hy, lid); p.set(142, hy, lid);
        p.rect(129, hy + 4, 2, 1, mix(sk, c("#f09a9a"), 0.5)); p.rect(142, hy + 4, 2, 1, mix(sk, c("#f09a9a"), 0.5)); p.rect(135, hy + 5, 3, 1, dark(sk, 0.3));
        if (age < 13) { const bear = c("#c49a68"); p.ellipse(232, 104, 6, 6, bear); p.ellipse(232, 95, 5, 4.5, bear); p.ellipse(228, 91, 2, 2, bear); p.ellipse(236, 91, 2, 2, bear); p.ellipse(232, 97, 2.2, 1.5, lite(bear, 0.35)); p.set(230, 94, c("#2b2230")); p.set(234, 94, c("#2b2230")); }
        p.rect(152, 108, 102, 18, blanket); p.rect(152, 108, 102, 3, lite(blanket, 0.22)); for (let i = 8; i < 102; i += 16) p.rect(152 + i, 111, 1, 15, dark(blanket, 0.12)); p.rect(152, 124, 102, 2, dark(blanket, 0.2)); p.rect(152, 110, 10, 16, lite(blanket, 0.1));
        p.rect(118, 140, 4, 24, metal); p.rect(250, 140, 4, 24, metal); p.ellipse(120, 165, 3, 2, c("#4a5556")); p.ellipse(252, 165, 3, 2, c("#4a5556"));
      });
      p.sprite(() => {
        p.rect(266, 46, 48, 36, c("#5f7474")); p.rect(269, 49, 42, 28, c("#1e3533")); p.rect(288, 82, 4, 82, c("#768a8a")); p.rect(276, 162, 28, 3, c("#768a8a"));
        const beat = Math.floor(time * 4) % 42, line = c("#8ee0a9");
        for (let x = 0; x < 42; x++) { const d = (x - beat + 42) % 42, y = d === 2 ? 56 : d === 3 ? 70 : d === 4 ? 62 : 65; p.rect(269 + x, y, 1, 1, d < 6 ? lite(line, 0.4) : line); }
        p.rect(271, 51, 6, 1, c("#f2b6a0")); p.rect(300, 51, 8, 1, c("#8ee0a9"));
      });
      person(50, 172, { seed: life.seed + 6, age: 40, sex: "F", skinSeed: life.seed });
    } else {
      room(kind === "work" ? c("#dfe2dd") : c("#ead9c2")); windowFrame(26, 18, 54, 44);
      if (kind === "home") {
        frame(238, 16, 48, 34, () => { p.rect(242, 20, 40, 26, L.sky[1]); p.ellipse(262, 46, 22, 9, L.hill); p.ellipse(270, 28, 3, 3, c("#f6d48c")); });
        p.sprite(() => { const shelf = c("#8b6a4c"); p.rect(130, 38, 56, 3, shelf); [c("#b25e6d"), c("#5f78b0"), c("#d39a4c"), c("#4f8a8b")].forEach((v, i) => p.rect(134 + i * 7, 24 + (i % 2) * 2, 6, 14 - (i % 2) * 2, v)); p.ellipse(174, 33, 5, 5, c("#e2d1b6")); });
        p.ellipse(168, 166, 118, 12, c("#b77c6a")); p.ellipse(168, 166, 110, 10, c("#c98f78")); for (let x = 64; x < 272; x += 10) p.set(x, 166, c("#e1b08f"));
        p.sprite(() => { const cloth = c("#f2ead9"), wood = c("#8c6a4c"); p.rect(120, 118, 96, 5, cloth); p.rect(120, 123, 96, 10, dark(cloth, 0.08)); for (let i = 0; i < 96; i += 12) p.rect(120 + i, 123, 1, 10, dark(cloth, 0.14)); p.rect(128, 133, 4, 22, wood); p.rect(204, 133, 4, 22, wood); p.rect(138, 111, 9, 7, c("#ffffff")); p.rect(147, 113, 2, 3, c("#ffffff")); p.ellipse(174, 116, 10, 3, c("#e7c27b")); p.ellipse(174, 114, 7, 2, c("#c8584d")); p.rect(196, 106, 3, 12, c("#f6efe0")); p.rect(197, 103, 1, 3, c("#ffcf6b")); });
        // Each stage of life leaves its own things in the room.
        if (age < 13) {
          p.sprite(() => { [c("#e4566b"), c("#f2c14e"), c("#5fa8d3")].forEach((v, i) => { const y = 160 - (i === 1 ? 8 : 0); p.rect(96 + i * 9 - (i === 1 ? 4 : 0), y, 8, 8, v); p.rect(96 + i * 9 - (i === 1 ? 4 : 0), y, 8, 1, lite(v, 0.3)); }); p.ellipse(228, 166, 5, 5, c("#7cc28a")); p.rect(226, 163, 2, 2, lite(c("#7cc28a"), 0.4)); });
          p.sprite(() => { p.rect(200, 22, 22, 18, c("#fbf6ea")); p.ellipse(211, 30, 4, 4, c("#f2c14e")); p.rect(202, 36, 18, 2, c("#7cc28a")); p.rect(208, 20, 6, 3, c("#efe3c3")); });
        } else if (age < 30) {
          p.sprite(() => { p.rect(100, 18, 24, 32, c("#2f3b4f")); p.ellipse(112, 30, 7, 7, c("#e4566b")); p.rect(104, 42, 16, 2, c("#f2c14e")); p.rect(104, 46, 10, 1, c("#d9e4d6")); });
        } else if (age < 65) {
          const year = life.birthYear + age, here = (r: { birthYear: number; deathAge: number | null }) => r.birthYear <= year && (r.deathAge === null || r.birthYear + r.deathAge > year);
          const mate = life.family.partner;
          if ((mate && here(mate) && age >= (life.family.marriageAge ?? 18)) || life.family.children.some(here)) frame(198, 20, 28, 22, () => { p.rect(200, 22, 24, 18, c("#d9c8a8")); p.ellipse(207, 30, 3, 3, c("#8a6a52")); p.rect(204, 33, 6, 7, c("#5f78b0")); p.ellipse(217, 30, 3, 3, c("#5a3e30")); p.rect(214, 33, 6, 7, c("#b25e6d")); });
        } else {
          ([[98, 18], [98, 38], [200, 22]] as const).forEach(([x, y], i) => frame(x, y, 18, 14, () => { p.rect(x + 2, y + 2, 14, 10, [c("#d9c8a8"), c("#c8d6c9"), c("#e3cfc0")][i]); p.ellipse(x + 9, y + 7, 2, 2, c("#8a6a52")); p.rect(x + 7, y + 9, 4, 3, c("#8a6a52")); }));
          p.sprite(() => { const w = c("#8b5e3c"); p.rect(274, 112, 4, 48, w); p.rect(296, 112, 4, 48, w); for (let y = 116; y < 138; y += 6) p.rect(278, y, 18, 2, lite(w, 0.1)); p.rect(270, 140, 34, 5, w); p.rect(278, 134, 18, 6, c("#b25e6d")); p.rect(272, 145, 3, 12, dark(w, 0.2)); p.rect(299, 145, 3, 12, dark(w, 0.2)); for (let x = 264; x < 312; x++) p.rect(x, 157 + Math.round(((x - 288) / 24) ** 2 * 3), 1, 2, dark(w, 0.15)); });
          p.sprite(() => { p.rect(238, 160, 16, 10, c("#b38a5a")); p.rect(238, 160, 16, 1, lite(c("#b38a5a"), 0.25)); p.ellipse(242, 158, 4, 4, c("#c95f73")); p.ellipse(249, 159, 3, 3, c("#5fa8d3")); p.rect(244, 148, 1, 10, c("#d9d6cf")); });
        }
        if (age < 65) plant(298, 150);
        petSpot = [262, 172];
      } else {
        // The workplace follows the job; office work is the default.
        const job = life.stats.job, wood = c("#9a7859");
        if (job === "teacher") {
          p.sprite(() => { p.rect(130, 22, 150, 54, c("#9a7752")); p.rect(134, 26, 142, 46, c("#3f6458")); const chalk = c("#d9e4d6"); for (let l = 0; l < 3; l++) for (let x = 142; x < 142 + 60 + rand(l + 90) * 50; x += 9) p.rect(x, 34 + l * 10, 6, 1, chalk); p.rect(240, 40, 20, 1, chalk); p.rect(249, 31, 1, 20, chalk); p.rect(128, 76, 154, 3, c("#b08a60")); });
          p.sprite(() => { p.rect(150, 118, 100, 6, lite(wood, 0.1)); p.rect(154, 124, 92, 32, wood); p.rect(154, 124, 92, 1, dark(wood, 0.25)); p.rect(166, 108, 16, 10, c("#b25e6d")); p.rect(168, 104, 14, 4, c("#5f78b0")); p.ellipse(226, 113, 5, 5, c("#c94f45")); p.set(226, 107, c("#6d8a55")); p.rect(224, 110, 2, 2, lite(c("#c94f45"), 0.4)); });
          plant(296, 150);
        } else if (job === "nurse") {
          p.sprite(() => { p.rect(150, 16, 26, 26, c("#f6f1e6")); p.rect(159, 20, 8, 18, c("#c0505a")); p.rect(154, 25, 18, 8, c("#c0505a")); });
          p.sprite(() => { const cab = c("#eef2ef"); p.rect(214, 40, 70, 112, cab); p.rect(280, 40, 4, 112, dark(cab, 0.12)); p.rect(218, 44, 30, 50, c("#cfe3e6")); p.rect(252, 44, 28, 50, c("#cfe3e6")); for (let y = 58; y < 94; y += 14) p.rect(218, y, 62, 2, cab); [c("#c0505a"), c("#5fa8d3"), c("#f2c14e"), c("#7cc28a")].forEach((v, i) => p.rect(222 + i * 14, 50 + (i % 2) * 14, 5, 8, v)); p.rect(218, 100, 62, 48, dark(cab, 0.05)); p.rect(247, 120, 4, 2, c("#9aa9aa")); });
          p.sprite(() => { const metal = c("#8ea4a3"); p.rect(170, 52, 2, 110, metal); p.rect(162, 52, 18, 2, metal); p.rect(164, 56, 14, 18, c("#cfe7ea")); p.rect(164, 64, 14, 10, c("#a9d3d8")); p.rect(164, 160, 14, 3, metal); });
        } else if (job === "cook") {
          p.sprite(() => { const tile = c("#e3ece6"); p.rect(110, 40, 200, 74, tile); for (let x = 110; x < 310; x += 12) p.rect(x, 40, 1, 74, dark(tile, 0.08)); for (let y = 40; y < 114; y += 12) p.rect(110, y, 200, 1, dark(tile, 0.08)); }, false);
          p.sprite(() => { const metal = c("#a9b3b5"); p.rect(196, 22, 70, 16, metal); p.rect(196, 22, 70, 2, lite(metal, 0.3)); p.rect(206, 38, 50, 4, dark(metal, 0.2)); p.rect(186, 112, 90, 48, c("#4a4f55")); p.rect(186, 112, 90, 4, c("#6b7177")); p.rect(196, 124, 70, 26, c("#3a3e43")); p.rect(206, 98, 22, 14, c("#8d969a")); p.rect(204, 98, 26, 3, lite(c("#8d969a"), 0.3)); p.rect(238, 104, 18, 8, c("#2f3236")); p.rect(256, 106, 10, 2, c("#2f3236")); });
          for (let i = 0; i < 6; i++) { const sx = 212 + i * 3, sy = 92 - ((Math.floor(time * 6) + i * 3) % 14); p.set(sx, sy, c("#f6f8f6")); p.set(sx + 1, sy - 1, c("#e4eae6")); }
          p.sprite(() => { const pan = c("#3a3e43"); p.rect(120, 52, 60, 2, c("#7a6656")); for (const [x, r] of [[132, 6], [150, 8], [168, 5]] as const) { p.rect(x, 54, 1, 6, pan); p.ellipse(x, 60 + r, r, r, pan); p.ellipse(x - 1, 59 + r, r - 2, r - 2, lite(pan, 0.15)); } });
          p.sprite(() => { p.rect(122, 120, 56, 6, c("#d9d6cf")); p.rect(124, 126, 52, 34, wood); p.rect(136, 112, 18, 8, c("#c49a6c")); p.ellipse(164, 116, 5, 3, c("#7cc28a")); p.ellipse(168, 117, 3, 2, c("#c94f45")); });
        } else if (job === "shop" || job === "vendor") {
          p.sprite(() => { const shelf = c("#8b6a4c"); p.rect(196, 18, 104, 96, dark(shelf, 0.2)); for (let row = 0; row < 4; row++) { const y = 40 + row * 24; p.rect(196, y, 104, 3, shelf); for (let i = 0; i < 11; i++) { const v = SHIRT[(i + row * 3) % SHIRT.length]; p.rect(200 + i * 9, y - 12 + (i % 2) * 2, 7, 12 - (i % 2) * 2, v); p.rect(200 + i * 9, y - 12 + (i % 2) * 2, 7, 1, lite(v, 0.35)); } } });
          p.sprite(() => { p.rect(112, 118, 100, 6, lite(wood, 0.12)); p.rect(116, 124, 92, 38, wood); p.rect(116, 124, 92, 1, dark(wood, 0.25)); p.rect(160, 100, 30, 18, c("#5d6268")); p.rect(163, 103, 24, 7, c("#9fd3b5")); p.rect(160, 98, 30, 2, c("#7b8187")); for (let i = 0; i < 4; i++) p.rect(164 + i * 6, 112, 4, 3, c("#d9d6cf")); p.ellipse(132, 114, 6, 4, c("#c94f45")); p.ellipse(142, 115, 5, 3, c("#f2c14e")); });
        } else if (job === "factory" || job === "warehouse" || job === "mechanic" || job === "artisan") {
          const crate = (x: number, y: number) => p.sprite(() => { const w = c("#b8895a"); p.rect(x, y, 30, 28, w); p.rect(x, y, 30, 2, lite(w, 0.25)); p.rect(x + 26, y, 4, 28, dark(w, 0.2)); for (let i = 0; i < 28; i++) { p.set(x + Math.round(i * 30 / 28), y + i, dark(w, 0.25)); p.set(x + 29 - Math.round(i * 30 / 28), y + i, dark(w, 0.25)); } });
          crate(204, 132); crate(236, 132); crate(220, 104);
          p.sprite(() => { const g = c("#7f8a8f"); p.ellipse(160, 46, 14, 14, g); for (let a = 0; a < 8; a++) p.rect(158 + Math.round(Math.cos(a * Math.PI / 4) * 15), 44 + Math.round(Math.sin(a * Math.PI / 4) * 15), 5, 5, g); p.ellipse(160, 46, 5, 5, c("#e8e2d2")); });
          p.sprite(() => { const box = c("#c0505a"); p.rect(130, 144, 34, 18, box); p.rect(130, 144, 34, 3, lite(box, 0.25)); p.rect(140, 138, 14, 2, c("#3f4146")); p.rect(140, 138, 2, 6, c("#3f4146")); p.rect(152, 138, 2, 6, c("#3f4146")); p.rect(145, 151, 4, 2, c("#d9d6cf")); });
        } else if (job === "hairdresser") {
          p.sprite(() => { const fr = c("#c9a45c"); p.rect(176, 26, 56, 72, fr); p.rect(180, 30, 48, 64, c("#bcd3d8")); p.rect(186, 36, 2, 20, c("#e6f0f1")); p.rect(192, 34, 2, 12, c("#e6f0f1")); p.rect(240, 70, 50, 3, c("#8b6a4c")); [c("#c95f73"), c("#5fa8d3"), c("#f2c14e"), c("#7cc28a")].forEach((v, i) => { p.rect(244 + i * 11, 58 + (i % 2) * 2, 6, 12 - (i % 2) * 2, v); p.rect(245 + i * 11, 55 + (i % 2) * 2, 4, 3, dark(v, 0.3)); }); });
          p.sprite(() => { const seat = c("#2f2d30"), red = c("#a5343f"); p.rect(188, 104, 32, 24, red); p.rect(188, 104, 32, 2, lite(red, 0.25)); p.rect(184, 126, 40, 8, red); p.rect(202, 134, 4, 18, seat); p.rect(190, 152, 28, 4, seat); p.rect(182, 116, 6, 12, seat); p.rect(220, 116, 6, 12, seat); });
        } else {
        p.sprite(() => { const shelf = c("#7a6656"); p.rect(214, 28, 80, 3, shelf); p.rect(214, 58, 80, 3, shelf); for (let i = 0; i < 10; i++) p.rect(218 + i * 7, 13 + (i % 3), 6, 15 - (i % 3), SHIRT[i % SHIRT.length]); for (let i = 0; i < 6; i++) p.rect(219 + i * 12, 44, 10, 14, dark(c("#e8e2d2"), i * 0.04)); });
        p.sprite(() => { const desk = c("#9a7859"); p.rect(122, 116, 120, 6, lite(desk, 0.1)); p.rect(126, 122, 112, 10, desk); p.rect(128, 132, 5, 30, dark(desk, 0.2)); p.rect(231, 132, 5, 30, dark(desk, 0.2)); p.rect(150, 80, 54, 34, c("#323a45")); p.rect(153, 83, 48, 26, c("#8fc7d6")); p.rect(153, 83, 48, 5, lite(c("#8fc7d6"), 0.3)); for (let i = 0; i < 4; i++) p.rect(158, 91 + i * 4, 18 + i * 6, 1, c("#e9f4f2")); p.rect(173, 114, 8, 3, c("#323a45")); p.rect(158, 113, 38, 3, c("#d9d6cf")); p.rect(214, 106, 9, 10, c("#f2efe8")); p.rect(223, 108, 3, 4, c("#f2efe8")); p.rect(215, 107, 7, 2, c("#7a4a33")); });
        plant(296, 150);
        }
      }
      person(kind === "work" ? 96 : 70, 174, self);
      const partner = life.family.partner;
      if (kind === "home" && partner && partner.birthYear <= life.birthYear + age && (partner.deathAge === null || partner.birthYear + partner.deathAge > life.birthYear + age) && age >= (life.family.marriageAge ?? 18)) { person(236, 174, { seed: hash(partner.id), age: life.birthYear + age - partner.birthYear, sex: partner.sex }); petSpot = [272, 174]; }
      if (kind === "home") life.family.children.filter(ch => ch.birthYear <= life.birthYear + age && (ch.deathAge === null || ch.birthYear + ch.deathAge > life.birthYear + age)).slice(0, 3).forEach((ch, i) => person(124 + i * 38, 178, { seed: hash(ch.id), age: Math.max(3, life.birthYear + age - ch.birthYear), sex: ch.sex, skinSeed: i % 2 && partner ? hash(partner.id) : life.seed }));
      if (kind === "work") petSpot = null;
    }
  } else if (kind === "city" || kind === "travel") {
    sky(138);
    for (let i = 0; i < 12; i++) { const bw = 18 + Math.floor(rand(i + 50) * 16), bh = 30 + Math.floor(rand(i + 60) * 40); p.rect(i * 28 - 6, 138 - bh, bw, bh, mix(L.far, L.sky[L.sky.length - 1], 0.25)); }
    const facades = [c("#c9b79c"), c("#b98f74"), c("#a9b2a6"), c("#d3c3a3"), c("#9aa6b0")];
    const tower = (x: number, w: number, h: number, i: number) => p.sprite(() => {
      const f = facades[(i + life.seed) % facades.length], top = 140 - h;
      p.rect(x, top, w, h, f); p.rect(x + w - 6, top, 6, h, dark(f, 0.18)); p.rect(x, top, 2, h, lite(f, 0.14)); p.rect(x - 2, top - 3, w + 4, 3, dark(f, 0.25));
      if (i % 2) { p.rect(x + 6, top - 9, 8, 6, dark(f, 0.3)); p.rect(x + 8, top - 12, 4, 3, dark(f, 0.3)); }
      for (let y = top + 6; y < 124; y += 11) for (let xx = x + 5; xx < x + w - 9; xx += 9) {
        const lit = (L.dusk || age >= 65) && rand(xx + y) > 0.45;
        p.rect(xx, y, 5, 7, lit ? c("#f6cf7e") : mix(L.sky[1], c("#5f7f93"), 0.45)); p.rect(xx, y, 5, 1, lit ? c("#fde7b0") : lite(L.sky[1], 0.3)); p.rect(xx, y + 7, 5, 1, dark(f, 0.12));
      }
      p.rect(x + w / 2 - 6, 124, 12, 16, dark(f, 0.42)); p.rect(x + w / 2 - 8, 121, 16, 3, dark(f, 0.2));
    });
    tower(4, 54, 100, 0); tower(66, 46, 76, 1); tower(120, 58, 116, 2); tower(186, 50, 84, 3); tower(244, 64, 66, 4);
    const walk = c("#c7c1b3"), road = c("#5d6268");
    p.rect(0, 140, W, 24, walk); p.rect(0, 140, W, 1, lite(walk, 0.3)); for (let x = 0; x < W; x += 24) p.rect(x, 141, 1, 23, dark(walk, 0.12)); p.rect(0, 152, W, 1, dark(walk, 0.08)); p.rect(0, 164, W, 3, c("#8e8a82"));
    p.rect(0, 167, W, 13, road); for (let x = (Math.floor(time * 20) % 40) - 40; x < W; x += 40) p.rect(x, 173, 18, 2, c("#e8dfbf"));
    const lamp = (x: number) => { p.sprite(() => { p.rect(x, 96, 3, 66, c("#3f4146")); p.rect(x - 5, 93, 13, 4, c("#3f4146")); p.rect(x - 4, 97, 11, 4, (L.dusk || age >= 65) ? c("#ffe2a0") : c("#d8dbd2")); }); if (L.dusk || age >= 65) p.tint(x - 16, 101, 36, 62, (v) => lite(v, 0.12), (xx, yy) => Math.abs(xx - x - 1) < (yy - 97) * 0.3); };
    lamp(40); lamp(262);
    tree(296, 160, 18); bush(16, 160, 12);
    if (kind === "travel") {
      const px = ((Math.floor(time * 18) + 40) % 380) - 40;
      p.sprite(() => { const body = c("#f4f1ea"); p.rect(px, 30, 46, 6, body); p.rect(px + 46, 31, 4, 4, body); p.rect(px - 2, 24, 8, 8, c("#c0505a")); p.rect(px + 14, 34, 18, 4, dark(body, 0.15)); p.rect(px + 18, 26, 10, 4, dark(body, 0.1)); for (let i = 0; i < 6; i++) p.set(px + 12 + i * 5, 32, c("#7fa6c4")); });
      p.rect(px - 60, 32, 58, 1, lite(L.sky[0], 0.5));
      p.sprite(() => { const bag = c("#b56a4f"); p.rect(186, 134, 22, 28, bag); p.rect(186, 134, 22, 3, lite(bag, 0.2)); p.rect(192, 128, 10, 6, dark(bag, 0.3)); p.rect(194, 130, 6, 4, bag); p.rect(188, 146, 18, 2, dark(bag, 0.25)); p.ellipse(190, 163, 2, 1, c("#2f2d30")); p.ellipse(204, 163, 2, 1, c("#2f2d30")); });
    } else if (age < 13) {
      // A kite on a string for a child's day in town.
      p.sprite(() => { const k = c("#e4566b"); for (let r = 0; r < 7; r++) { p.rect(226 - r, 34 + r, 1 + r * 2, 1, r < 3 ? lite(k, 0.2) : k); p.rect(226 - (6 - r), 41 + r, 1 + (6 - r) * 2, 1, dark(k, 0.1)); } p.rect(226, 34, 1, 14, c("#f2c14e")); }, false);
      for (let i = 0; i < 26; i++) p.set(Math.round(226 - i * 2.4), Math.round(48 + i * 3.4 + Math.sin(i * 0.5) * 2), c("#f6f1e6"));
    } else if (age < 30) {
      p.sprite(() => { const frameC = c("#3f6f86"), tyre = c("#2f2d30"); for (const wx of [200, 228]) { p.ellipse(wx, 154, 8, 8, tyre); p.ellipse(wx, 154, 6, 6, c("#c7c1b3")); p.set(wx, 154, tyre); } p.rect(200, 146, 28, 2, frameC); p.rect(206, 146, 2, 8, frameC); p.rect(214, 140, 2, 14, frameC); p.rect(210, 139, 8, 2, c("#3a3332")); p.rect(224, 138, 2, 8, frameC); p.rect(222, 137, 6, 2, c("#3a3332")); }, true);
    } else if (age < 65) {
      p.sprite(() => { const metal = c("#3f4146"), top = c("#f2ead8"); p.rect(196, 146, 22, 2, top); p.rect(206, 148, 2, 14, metal); p.rect(201, 161, 12, 1, metal); p.rect(202, 142, 4, 4, c("#f6f1e6")); p.rect(206, 143, 1, 2, c("#f6f1e6")); p.rect(222, 140, 10, 2, metal); p.rect(222, 150, 10, 2, c("#b56a4f")); p.rect(230, 140, 2, 22, metal); p.rect(222, 152, 2, 10, metal); });
    } else {
      p.sprite(() => { const wood = c("#a57650"), iron = c("#3d3a40"); p.rect(190, 140, 50, 3, wood); p.rect(190, 145, 50, 3, wood); p.rect(188, 150, 54, 3, lite(wood, 0.1)); p.rect(192, 153, 3, 9, iron); p.rect(235, 153, 3, 9, iron); });
      for (const [bx, by] of [[250, 160], [262, 158], [180, 161]] as const) p.sprite(() => { const g = c("#8d8f99"); p.ellipse(bx, by, 4, 3, g); p.ellipse(bx + 3, by - 3, 2, 2, lite(g, 0.1)); p.set(bx + 5, by - 3, c("#d9a441")); p.rect(bx - 1, by + 3, 1, 1, c("#d9a441")); p.rect(bx + 1, by + 3, 1, 1, c("#d9a441")); });
    }
    person(158, 162, self); family(130, 162, [104, 82]); petSpot = [214, 162];
  } else if (kind === "farm") {
    outdoors(100);
    p.sprite(() => {
      const red = c("#a9473f"), trim = c("#f2ead8"), roof = c("#5a3b34");
      p.rect(14, 74, 104, 74, red); p.rect(100, 74, 18, 74, dark(red, 0.2));
      for (let i = 0; i < 13; i++) p.rect(10 + i * 3, 74 - i * 3, 112 - i * 6, 3, i % 2 ? roof : lite(roof, 0.1));
      for (let x = 18; x < 116; x += 8) p.rect(x, 78, 1, 70, dark(red, 0.12));
      p.rect(48, 106, 34, 42, dark(red, 0.35)); p.rect(48, 106, 34, 2, trim); p.rect(48, 106, 2, 42, trim); p.rect(80, 106, 2, 42, trim);
      for (let i = 0; i < 34; i++) { p.set(49 + i, 108 + i * 1.18, trim); p.set(80 - i, 108 + i * 1.18, trim); }
      p.rect(56, 82, 18, 14, c("#3c4a52")); p.rect(56, 82, 18, 2, trim); p.rect(64, 82, 2, 14, trim);
    });
    for (let row = 0; row < 8; row++) { const y = 106 + row * 7; p.rect(136, y, 184, 3, dark(L.grass, 0.12 + row * 0.01)); for (let x = 138 + (row % 2) * 4; x < W; x += 8) { p.set(x, y - 1, lite(L.leaf, 0.2)); p.rect(x + 1, y - 3, 1, 2, L.leaf); } }
    tree(298, 104, 20); pine(132, 102, 24);
    p.sprite(() => { const hay = c("#e2c06b"); p.rect(222, 140, 32, 20, hay); p.rect(222, 140, 32, 2, lite(hay, 0.3)); for (let x = 224; x < 254; x += 4) p.rect(x, 142, 1, 18, dark(hay, 0.15)); p.rect(222, 148, 32, 2, c("#9b7a3f")); });
    // Chickens peck in the yard; a child gets a pail, later life a stool by the barn.
    for (const [hx, hy, k] of [[218, 172, 0], [244, 175, 1], [116, 174, 2]] as const) p.sprite(() => { const hen = k === 1 ? c("#b9784a") : c("#f4efe4"), peck = (Math.floor(time * 3) + k) % 3 === 0 ? 3 : 0; p.ellipse(hx, hy - 7, 9, 6, hen); p.ellipse(hx - 2, hy - 9, 5, 3, lite(hen, 0.2)); p.rect(hx - 10, hy - 13, 5, 6, dark(hen, 0.12)); p.ellipse(hx + 8, hy - 14 + peck, 4, 4, hen); p.rect(hx + 12, hy - 14 + peck, 3, 2, c("#e0a33a")); p.rect(hx + 7, hy - 20 + peck, 3, 3, c("#d2453d")); p.rect(hx + 9, hy - 15 + peck, 1, 1, c("#2b2230")); p.rect(hx - 2, hy - 1, 1, 3, c("#e0a33a")); p.rect(hx + 2, hy - 1, 1, 3, c("#e0a33a")); });
    if (age < 13) p.sprite(() => { const pail = c("#5fa8d3"); p.rect(142, 156, 14, 13, pail); p.rect(142, 156, 14, 2, lite(pail, 0.35)); p.rect(144, 150, 10, 1, c("#3f4146")); p.rect(143, 150, 1, 6, c("#3f4146")); p.rect(154, 150, 1, 6, c("#3f4146")); });
    else if (age >= 65) p.sprite(() => { const w = c("#8b5e3c"); p.rect(136, 152, 18, 4, lite(w, 0.1)); p.rect(138, 156, 2, 12, w); p.rect(150, 156, 2, 12, w); });
    person(170, 168, self); family(144, 168, [96, 74]); p.sprite(() => { p.rect(194, 112, 3, 56, c("#8b6c4e")); p.rect(188, 110, 14, 4, c("#7c8a90")); });
    p.sprite(() => { const post = c("#8b6c4e"); for (let x = 4; x < W; x += 34) p.rect(x, 160, 5, 20, post); p.rect(0, 165, W, 3, lite(post, 0.15)); p.rect(0, 173, W, 3, post); });
    petSpot = [118, 172];
  } else if (kind === "wedding") {
    outdoors(108); path(150, 20);
    tree(28, 150, 30); tree(296, 150, 28); tree(258, 128, 18);
    const bloom = [c("#f6c3cf"), c("#ffffff"), c("#f2a6b9"), c("#fbe3a4")];
    p.sprite(() => { const post = c("#f3ead6"); p.rect(102, 50, 7, 116, post); p.rect(212, 50, 7, 116, post); p.rect(100, 45, 121, 7, post); p.rect(108, 52, 1, 114, dark(post, 0.15)); p.rect(218, 52, 1, 114, dark(post, 0.15)); });
    for (let i = 0; i < 38; i++) { const x = i < 12 ? 105 : i < 26 ? 105 + ((i - 12) / 13) * 111 : 216, y = i < 12 ? 162 - i * 10 : i < 26 ? 47 : 47 + (i - 26) * 10; p.sprite(() => { p.ellipse(x, y, 5, 4, dark(c("#6f9a62"), 0.05)); p.ellipse(x + (i % 3) - 1, y - 1, 3, 3, bloom[i % bloom.length]); p.set(x + (i % 3) - 2, y - 2, lite(bloom[i % bloom.length], 0.5)); }, false); }
    // The real spouse at the altar; a stand-in only when the scene is drawn before one exists.
    const other: PersonLook = mate ? { seed: hash(mate.id), age: Math.max(16, year - mate.birthYear), sex: mate.sex } : { seed: life.seed + 8, age, sex: life.sex === "M" ? "F" : "M" };
    person(144, 166, { ...self, outfit: life.sex === "F" ? "gown" : "suit" }); person(178, 166, { ...other, outfit: other.sex === "F" ? "gown" : "suit" });
    for (let i = 0; i < 16; i++) { const fx = Math.floor((rand(i + 70) * 220 + 50 + Math.sin(time + i) * 6)), fy = Math.floor((rand(i + 90) * 120 + time * 14 + i * 9) % 130) + 10; p.rect(fx, fy, 2, 1, bloom[i % bloom.length]); }
    for (let i = 0; i < 24; i++) flower(Math.floor(rand(i + 400) * W), 116 + Math.floor(rand(i + 420) * 30), i);
  } else if (kind === "beach") {
    sky(92);
    const sea = c("#3f93ad");
    for (let y = 92; y < 128; y++) p.rect(0, y, W, 1, mix(lite(sea, 0.25), sea, Math.floor(((y - 92) / 36) * 4) / 3));
    p.rect(0, 92, W, 1, lite(sea, 0.5));
    p.ellipse(70, 93, 30, 7, mix(L.far, sea, 0.3)); p.rect(36, 93, 70, 2, mix(L.far, sea, 0.3));
    for (let i = 0; i < 20; i++) { const x = (Math.floor(rand(i + 500) * W) + Math.floor(time * 6)) % W, y = 97 + Math.floor(rand(i + 520) * 28); p.rect(x, y, 4 + (i % 3) * 2, 1, lite(sea, 0.45)); }
    if (L.sun) for (let y = 94; y < 126; y += 3) p.rect(L.sunX - 6 + ((y + Math.floor(time * 4)) % 5), y, 8 - ((y / 3) % 3) * 2, 1, lite(L.sun, 0.2));
    const sand = c("#e6d0a1");
    for (let y = 128; y < H; y++) p.rect(0, y, W, 1, mix(lite(sand, 0.1), dark(sand, 0.1), Math.floor(((y - 128) / 52) * 5) / 4));
    const foam = Math.round(Math.sin(time * 1.6) * 3);
    for (let x = 0; x < W; x++) { const y = 127 + foam + Math.round(Math.sin(x * 0.08) * 1.5); p.rect(x, y, 1, 2, c("#f5f3ea")); p.set(x, y + 2, lite(sand, 0.35)); p.set(x, y - 1, lite(sea, 0.2)); }
    for (let i = 0; i < 24; i++) p.rect(Math.floor(rand(i + 600) * W), 136 + Math.floor(rand(i + 620) * 42), 2, 1, dark(sand, 0.18));
    p.sprite(() => { const trunk = c("#8f6b48"); for (let i = 0; i < 80; i++) p.rect(34 + Math.round(Math.sin(i / 24) * 12), 176 - i, 6, 1, i % 6 < 3 ? trunk : lite(trunk, 0.12)); const lf = c("#4f8f58"); for (const [dx, dy, len] of [[-1, 0, 30], [1, 0, 32], [-1, 1, 22], [1, 1, 24], [0, -1, 12]] as const) for (let i = 0; i < len; i++) { const x = 46 + dx * i, y = 96 + (dy === -1 ? -i * 0.6 : Math.pow(i / len, 2) * 16 + dy * i * 0.4); p.rect(x, y, 3, 2, i % 3 ? lf : lite(lf, 0.18)); p.rect(x, y + 2, 3, 1, dark(lf, 0.2)); } p.ellipse(46, 99, 4, 4, c("#7a5a3a")); p.ellipse(44, 97, 1, 1, lite(c("#7a5a3a"), 0.3)); });
    p.sprite(() => { const s1 = c("#d8584d"), s2 = c("#f7efe1"); p.rect(253, 96, 3, 74, c("#6f5a46")); for (let r = 0; r < 16; r++) { const half = 6 + r * 2.4; for (let x = -Math.round(half); x <= half; x++) p.set(254 + x, 80 + r, Math.floor((x + 40) / 8) % 2 ? s1 : s2); } });
    p.sprite(() => { const towel = c("#5f8fbf"); p.rect(206, 160, 70, 12, towel); for (let x = 206; x < 276; x += 8) p.rect(x, 160, 3, 12, lite(towel, 0.35)); });
    // A sandcastle for children, a surfboard for young adults, a deck chair in later life.
    if (age < 13) p.sprite(() => { const sand = c("#e2c48f"); p.rect(186, 158, 30, 12, sand); p.rect(190, 148, 8, 10, sand); p.rect(204, 148, 8, 10, sand); p.rect(196, 142, 10, 16, lite(sand, 0.08)); for (const x of [190, 194, 204, 208, 196, 200, 204]) p.rect(x, x < 196 || x > 204 ? 146 : 140, 2, 2, sand); p.rect(199, 132, 1, 10, c("#7a6656")); p.rect(200, 132, 6, 4, c("#e4566b")); p.rect(198, 162, 6, 8, dark(sand, 0.25)); p.rect(222, 162, 10, 8, c("#f2c14e")); p.rect(222, 162, 10, 2, lite(c("#f2c14e"), 0.3)); });
    else if (age < 40) p.sprite(() => { const board = c("#5fa8d3"); for (let y = 0; y < 44; y++) { const half = Math.round(6 * Math.sin(Math.PI * (y + 2) / 48)); p.rect(206 - half, 126 + y, half * 2 + 1, 1, board); } p.rect(206, 128, 1, 40, c("#f6f1e6")); p.rect(202, 132, 2, 30, lite(board, 0.3)); });
    else if (age >= 60) p.sprite(() => { const w = c("#a57650"), cloth = c("#c0505a"); p.rect(196, 168, 2, 6, w); p.rect(226, 168, 2, 6, w); for (let i = 0; i < 18; i++) p.rect(198 + i, 150 + Math.round(i * 0.9), 2, 2, i % 6 < 3 ? cloth : c("#f6f1e6")); for (let i = 0; i < 14; i++) p.rect(214 + i, 166, 1, 2, i % 6 < 3 ? cloth : c("#f6f1e6")); p.rect(198, 150, 2, 24, w); });
    person(156, 170, self); family(130, 170, [182, 232]); petSpot = [96, 172];
  } else {
    outdoors(104);
    path(146, 20);
    if (kind === "memorial") {
      tree(42, 146, 30); pine(292, 140, 34); tree(250, 124, 16); bush(140, 146, 10);
      p.sprite(() => {
        const stone = c("#a9aeb0");
        p.rect(188, 100, 40, 48, stone); p.ellipse(208, 100, 20, 12, stone); p.rect(188, 100, 5, 48, lite(stone, 0.2)); p.rect(220, 96, 8, 52, dark(stone, 0.18)); p.ellipse(203, 94, 10, 4, lite(stone, 0.18));
        p.rect(198, 110, 20, 2, dark(stone, 0.3)); p.rect(200, 118, 16, 1, dark(stone, 0.3)); p.rect(200, 124, 16, 1, dark(stone, 0.3)); p.rect(202, 130, 12, 1, dark(stone, 0.3));
        p.rect(182, 146, 52, 6, dark(stone, 0.1)); p.rect(182, 146, 52, 1, lite(stone, 0.1));
      });
      for (let i = 0; i < 7; i++) flower(186 + i * 7, 141, i);
      const flick = Math.floor(time * 3) % 2;
      // Warm lantern light in stepped rings with a dithered rim, as hand-drawn pixel glows are.
      const warm = c("#ffc977"), lit = (x: number, y: number) => (x - 170) ** 2 + (y - 141) ** 2;
      p.tint(130, 100, 80, 80, (v) => mix(v, warm, 0.08), (x, y) => lit(x, y) < 1000 && (lit(x, y) < 760 || (x + y) % 2 === 0));
      p.tint(130, 100, 80, 80, (v) => mix(v, warm, 0.1), (x, y) => lit(x, y) < 520 + flick * 40);
      p.tint(130, 100, 80, 80, (v) => mix(v, warm, 0.14), (x, y) => lit(x, y) < 240);
      p.sprite(() => { p.rect(162, 130, 15, 20, c("#4a4448")); p.rect(165, 133, 9, 13, c("#ffd98a")); p.rect(167, 136 - flick, 5, 6, c("#fff3c8")); p.rect(160, 127, 19, 3, c("#4a4448")); p.rect(166, 123, 7, 4, c("#4a4448")); });
      bench(72, 168, 72);
      if (mourning) person(256, 172, self);
      for (let i = 0; i < 10; i++) { const fx = Math.floor(30 + rand(i + 700) * 260 + Math.sin(time * 0.8 + i) * 5), fy = Math.floor(60 + rand(i + 720) * 80 + Math.cos(time + i) * 4); if ((Math.floor(time * 2) + i) % 3) { p.set(fx, fy, c("#fff2a8")); p.set(fx + 1, fy, c("#e9e08a")); p.set(fx, fy - 1, mix(p.get(fx, fy - 1), c("#fff2a8"), 0.4)); } }
    } else {
      tree(36, 150, 32); tree(286, 146, 28); tree(240, 122, 16); pine(110, 120, 20);
      bush(196, 146, 12);
      for (let i = 0; i < 26; i++) flower(Math.floor(rand(i + 800) * W), 112 + Math.floor(rand(i + 820) * 30), i);
      for (let i = 0; i < 14; i++) flower(Math.floor(rand(i + 850) * W), 170 + Math.floor(rand(i + 870) * 8), i + 2);
      bench(104, 170, 96);
      if (age >= 50) {
        person(152, 170, self, "sit");
        family(126, 170, [214, 252], "sit");
        // The seat's front edge crosses the lap, so the figure reads as seated rather than standing.
        p.sprite(() => { const wood = c("#a57650"); p.rect(102, 147, 100, 4, lite(wood, 0.12)); p.rect(102, 151, 100, 3, dark(wood, 0.25)); });
        if (age >= 65 && !kids.length) for (const [bx, by] of [[222, 170], [236, 172], [250, 169]] as const) p.sprite(() => { const g = c("#8d8f99"); p.ellipse(bx, by, 4, 3, g); p.ellipse(bx - 3, by - 3, 2, 2, lite(g, 0.1)); p.set(bx - 5, by - 3, c("#d9a441")); p.rect(bx - 1, by + 3, 1, 1, c("#d9a441")); p.rect(bx + 1, by + 3, 1, 1, c("#d9a441")); });
        else p.sprite(() => { p.rect(176, 142, 14, 4, c("#5f78b0")); p.rect(176, 142, 14, 1, lite(c("#5f78b0"), 0.3)); p.rect(177, 145, 12, 1, c("#f4ecd8")); });
      } else {
        if (age < 13) p.sprite(() => { const ball = c("#e4566b"); p.ellipse(258, 168, 5, 5, ball); p.rect(253, 167, 11, 2, c("#f6f1e6")); p.set(256, 165, lite(ball, 0.5)); });
        else {
          p.ellipse(268, 176, 26, 5, c("#c0505a")); for (let x = 244; x < 294; x += 6) p.rect(x, 172, 3, 9, c("#f2ead8"));
          p.sprite(() => { const wicker = c("#b38a5a"); p.rect(270, 164, 14, 9, wicker); p.rect(270, 164, 14, 1, lite(wicker, 0.25)); p.rect(272, 160, 10, 1, dark(wicker, 0.2)); p.rect(272, 160, 1, 4, dark(wicker, 0.2)); p.rect(281, 160, 1, 4, dark(wicker, 0.2)); p.ellipse(258, 172, 2.5, 2.5, c("#c94f45")); p.set(258, 169, c("#6d8a55")); });
        }
        person(226, 172, self);
        family(200, 172, [176, 154]);
      }
      birds();
      petSpot = age >= 50 ? [232, 174] : [254, 174];
    }
  }
  if (age > 10 && petSpot) life.pets.filter(pt => pt.alive).slice(0, 1).forEach(pt => pet(petSpot![0], petSpot![1], pt.kind));
  return { kind, age, label: `${kind} · age ${age}`, rects: p.rects() };
}

export function sceneSvg(scene: PixelScene): string {
  // One path per colour keeps detailed scenes compact enough to embed many times in an album.
  const byColor = new Map<string, string[]>();
  for (const r of scene.rects) { const d = byColor.get(r.color) ?? []; d.push(`M${r.x} ${r.y}h${r.w}v${r.h}h-${r.w}z`); byColor.set(r.color, d); }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" width="960" height="540" shape-rendering="crispEdges">${[...byColor].map(([color, d]) => `<path fill="${color}" d="${d.join("")}"/>`).join("")}</svg>`;
}
export const sceneDataUrl = (scene: PixelScene) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sceneSvg(scene))}`;
export function drawPixelScene(ctx:CanvasRenderingContext2D,scene:PixelScene,x:number,y:number,w:number,h:number) {
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.translate(x,y);ctx.scale(w/320,h/180);ctx.imageSmoothingEnabled=false;
  for(const r of scene.rects){ctx.fillStyle=r.color;ctx.fillRect(r.x,r.y,r.w,r.h);}
  ctx.restore();
}
