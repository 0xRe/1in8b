/**
 * Deterministic pixel-art portraits (40×48) in the same hand-shaded style as the scenes:
 * hue-shifted shadows, self-coloured outlines, catchlights and age-appropriate features.
 */
type Rgb = number;
const W = 40, H = 48;
const c = (h: string): Rgb => parseInt(h.slice(1), 16);
const hex = (v: Rgb) => `#${v.toString(16).padStart(6, "0")}`;
const mix = (a: Rgb, b: Rgb, t: number): Rgb => {
  const ch = (s: number) => Math.round(((a >> s) & 255) + (((b >> s) & 255) - ((a >> s) & 255)) * t);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};
const SHADOW = c("#2a2340"), LIGHT = c("#fff4dc");
const dark = (v: Rgb, t: number) => mix(v, SHADOW, t);
const lite = (v: Rgb, t: number) => mix(v, LIGHT, t);

const SKIN = ["#f3cfb1", "#e3b18e", "#c98d68", "#a5694a", "#7c4a32", "#5a3524"].map(c);
const HAIR = ["#2b2220", "#47302a", "#6b4630", "#9c6337", "#c79a5a", "#1d1b22", "#7a3b2a"].map(c);
const toneIndex = (seed: number, salt: number, n: number) => (Math.imul((Math.abs(Math.floor(seed)) >>> 0) + salt * 977, 2654435761) >>> 0) % n;
/** Shared with the scenes so a person's portrait and figure match, and families can share a tone. */
export const skinTone = (seed: number) => hex(SKIN[toneIndex(seed, 1, SKIN.length)]);
export const hairTone = (seed: number) => hex(HAIR[toneIndex(seed, 2, HAIR.length)]);
const CLOTHES = ["#4f8a8b", "#b25e6d", "#5f78b0", "#d39a4c", "#6f9150", "#8d6bb0", "#c9705a", "#3f6f86", "#7d8b99"].map(c);
const BACKDROPS = ["#cfe0dc", "#ecd8cf", "#d6dcec", "#ece0c4", "#ddd3e8", "#d3e4cd"].map(c);

export interface PortraitSpec { seed: number; age: number; sex: string }
export interface PortraitPath { color: string; d: string }

export function portraitPaths({ seed, age, sex }: PortraitSpec): PortraitPath[] {
  const s = Math.abs(Math.floor(seed)) >>> 0;
  const pick = <T,>(list: T[], salt: number) => list[(Math.imul(s + salt * 977, 2654435761) >>> 0) % list.length];
  const px = new Int32Array(W * H).fill(-1);
  let layer: Map<number, Rgb> | null = null;
  const put = (i: number, v: Rgb) => { if (layer) layer.set(i, v); else px[i] = v; };
  const set = (x: number, y: number, v: Rgb) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H) put(y * W + x, v); };
  const rect = (x: number, y: number, w: number, h: number, v: Rgb) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) set(x + i, y + j, v); };
  const ellipse = (cx: number, cy: number, rx: number, ry: number, v: Rgb, yMin = -Infinity, yMax = Infinity) => {
    for (let y = Math.ceil(cy - ry); y <= Math.floor(cy + ry); y++) {
      if (y < yMin || y > yMax) continue;
      const half = rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2));
      for (let x = Math.ceil(cx - half - 0.01); x <= Math.floor(cx + half + 0.01); x++) set(x, y, v);
    }
  };
  const sprite = (draw: () => void) => {
    const own = new Map<number, Rgb>(), edge = new Map<number, Rgb>();
    layer = own; draw(); layer = null;
    for (const [i, v] of own) {
      const x = i % W, y = (i / W) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, j = ny * W + nx;
        if (nx >= 0 && ny >= 0 && nx < W && ny < H && !own.has(j) && !edge.has(j)) edge.set(j, dark(v, 0.55));
      }
    }
    for (const [i, v] of edge) px[i] = v;
    for (const [i, v] of own) px[i] = v;
  };

  const baby = age < 3, child = age < 13 && !baby, elder = age >= 62;
  const skin = SKIN[toneIndex(seed, 1, SKIN.length)];
  const lum = (v: Rgb) => ((v >> 16) & 255) * 0.3 + ((v >> 8) & 255) * 0.59 + (v & 255) * 0.11;
  // Hair close in tone to the skin reads as a bald head, so such pairs are pushed apart (as in the scenes).
  const toneHair = HAIR[toneIndex(seed, 2, HAIR.length)];
  const baseHair = Math.abs(lum(toneHair) - lum(skin)) < 40 ? mix(toneHair, c("#0d0a0c"), 0.6) : toneHair;
  const hair = age >= 66 ? c("#dcd6cc") : age >= 52 ? mix(baseHair, c("#cfc8bc"), 0.45) : baseHair;
  const cloth = pick(CLOTHES, 3), backdrop = pick(BACKDROPS, 4);
  const eye = c("#2b2230"), shade = dark(skin, 0.16), blush = mix(skin, c("#e8848c"), baby || child ? 0.42 : 0.3);
  const female = sex === "F";
  const style = (s >>> 3) % (female ? 5 : 4);
  const bald = !female && age >= 55 && s % 3 === 0;
  const beard = !female && age >= 22 && s % 5 === 0;
  const glasses = age >= 48 && (s >>> 5) % 2 === 0;

  // Backdrop: a soft cameo with a lighter halo behind the head.
  rect(0, 0, W, H, backdrop);
  ellipse(20, 20, 17, 17, lite(backdrop, 0.28));
  ellipse(20, 20, 13, 13, lite(backdrop, 0.42));

  if (baby || child) {
    (baby ? drawBaby : drawChild)();
    return flatten();
  }
  const cx = 20, cy = baby ? 25 : child ? 22 : 21;
  const rx = baby ? 10 : child ? 9 : 8, ry = baby ? 10 : child ? 9.5 : 10;
  const chin = Math.round(cy + ry);

  sprite(() => {
    // Hair behind the head and shoulders.
    if (!bald && !baby) {
      if (female && style === 0) ellipse(cx, cy + 5, rx + 3, ry + 9, dark(hair, 0.12), -Infinity, 40);
      if (female && style === 1) { ellipse(cx, cy, rx + 3, ry + 1.5, dark(hair, 0.12)); rect(cx - rx - 2, cy, (rx + 2) * 2 + 1, 8, dark(hair, 0.12)); }
      if (female && style === 3) { ellipse(cx + rx + 1, cy + 8, 3, 9, dark(hair, 0.1)); }
      if (female && style === 4) for (let a = 0; a < 12; a++) { const t = (a / 12) * Math.PI * 2; ellipse(cx + Math.cos(t) * (rx + 2), cy + 2 + Math.sin(t) * (ry + 3), 3, 3, dark(hair, 0.1)); }
    }
    // Shoulders and clothing.
    if (baby) {
      const blanket = mix(cloth, c("#f6efe6"), 0.55);
      ellipse(cx, H + 2, 18, 15, blanket); for (let x = 6; x < 36; x += 5) rect(x, 38, 1, 10, dark(blanket, 0.08)); ellipse(cx - 6, 40, 4, 2, lite(blanket, 0.3));
    } else {
      const sw = child ? 14 : 17, top = chin + (child ? 4 : 5);
      ellipse(cx, top + 13, sw, 13, cloth);
      ellipse(cx + 5, top + 14, sw - 5, 11, dark(cloth, 0.14));
      ellipse(cx - 6, top + 12, 5, 9, lite(cloth, 0.12));
      // Neck and neckline.
      rect(cx - 2, chin - 2, 5, top - chin + 3, skin); rect(cx - 2, chin - 1, 5, 2, shade);
      const neck = s % 3;
      if (neck === 0) ellipse(cx, top + 1, 4, 1.5, skin, -Infinity, top + 2);
      if (neck === 1) for (let i = 0; i < 4; i++) { const w = c("#f4efe4"); set(cx - 4 + i, top + i, w); set(cx - 5 + i, top + i, w); set(cx + 4 - i, top + i, w); set(cx + 5 - i, top + i, w); }
      if (neck === 2) for (let i = 0; i < 4; i++) rect(cx - 3 + i, top + i, 7 - i * 2, 1, skin);
    }
    // Head: ears, face, shading.
    if (!baby) { ellipse(cx - rx - 0.5, cy + 1, 1.6, 2.4, skin); ellipse(cx + rx + 0.5, cy + 1, 1.6, 2.4, shade); }
    ellipse(cx, cy, rx, ry, skin);
    // Light from the upper left: a narrow shadow along the right cheek and jaw.
    for (let y = Math.round(cy - 2); y <= chin - 1; y++) {
      const half = rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2));
      set(cx + Math.floor(half), y, shade); if (y > cy + 2) set(cx + Math.floor(half) - 1, y, mix(skin, shade, 0.5));
    }
    set(cx - rx + 3, cy - 4, lite(skin, 0.12)); set(cx - rx + 4, cy - 5, lite(skin, 0.12));
    rect(cx - 3, chin - 1, 7, 1, shade);
    // Hair on top.
    if (baby) { ellipse(cx - 1, cy - ry + 1, 4, 2, hair); set(cx + 2, cy - ry - 1, hair); set(cx + 3, cy - ry - 2, hair); }
    else if (bald) { rect(cx - rx, cy - 3, 2, 6, hair); rect(cx + rx - 1, cy - 3, 2, 6, hair); ellipse(cx - 3, cy - ry + 3, 2, 1, lite(skin, 0.25)); }
    else if (!female) {
      if (style === 3) ellipse(cx, cy - 4, rx + 0.5, ry - 3.5, mix(hair, skin, 0.35), -Infinity, cy - 5);
      else if (style === 2) for (let a = 0; a < 9; a++) { const t = Math.PI + (a / 8) * Math.PI; ellipse(cx + Math.cos(t) * (rx - 1), cy - 3 + Math.sin(t) * (ry - 3), 2.6, 2.6, hair); }
      else {
        ellipse(cx, cy - 4, rx + 1, ry - 3, hair, -Infinity, cy - 5);
        rect(cx - rx, cy - 5, 2, 4, hair); rect(cx + rx - 1, cy - 5, 2, 4, hair);
        if (style === 1) { rect(cx - rx + 1, cy - 5, rx + 3, 1, hair); set(cx + 3, cy - 6, lite(skin, 0.1)); }
      }
    } else {
      ellipse(cx, cy - 4, rx + 1, ry - 3, hair, -Infinity, cy - 4);
      if (style === 2) { ellipse(cx, cy - ry - 2, 4, 3.5, hair); ellipse(cx - 1, cy - ry - 3, 2, 1.5, lite(hair, 0.2)); }
      if (style === 1) rect(cx - rx, cy - 5, rx * 2 + 1, 2, hair);
      else { rect(cx - rx + 1, cy - 5, rx, 2, hair); set(cx + 1, cy - 4, hair); }
      rect(cx - rx - 1, cy - 4, 2, style === 2 ? 4 : 9, hair); rect(cx + rx, cy - 4, 2, style === 2 ? 4 : 9, dark(hair, 0.1));
    }
    if (!baby && !bald) ellipse(cx - 3, cy - ry + 2, 3, 1, lite(hair, 0.22), -Infinity, cy - ry + 2);
    // Face.
    const ey = Math.round(cy + (baby ? 0 : -1)), brow = dark(age >= 66 ? c("#9a9188") : baseHair, 0.15);
    const lx = cx - (baby || child ? 4 : 4), rxE = cx + (baby || child ? 3 : 3);
    if (!baby) { rect(lx - 1, ey - 2, 3, 1, brow); rect(rxE, ey - 2, 3, 1, brow); }
    rect(lx, ey, 2, 2, eye); rect(rxE, ey, 2, 2, eye); set(lx, ey, c("#ffffff")); set(rxE, ey, c("#ffffff"));
    if (glasses) { const f = c("#5b5048"); for (const gx of [lx - 1, rxE - 1]) { rect(gx, ey - 1, 4, 1, f); rect(gx, ey + 2, 4, 1, f); rect(gx, ey - 1, 1, 4, f); rect(gx + 3, ey - 1, 1, 4, f); } rect(cx - 1, ey, 2, 1, f); }
    rect(cx, ey + 3, 1, 2, shade); set(cx + 1, ey + 4, dark(skin, 0.24));
    rect(lx - 1, ey + 3, 2, 1, blush); rect(rxE + 1, ey + 3, 2, 1, blush);
    const my = ey + (baby ? 5 : 6), lip = mix(dark(skin, 0.3), c("#b4525a"), female ? 0.45 : 0.2);
    rect(cx - 1, my, 3, 1, lip); set(cx - 2, my - 1, lip); set(cx + 2, my - 1, lip);
    if (age >= 45) { set(lx - 1, my - 1, dark(skin, 0.12)); set(rxE + 2, my - 1, dark(skin, 0.12)); }
    if (elder) { rect(cx - 3, cy - ry + 4, 6, 1, dark(skin, 0.1)); set(lx + 2, ey + 2, dark(skin, 0.12)); set(rxE - 1, ey + 2, dark(skin, 0.12)); }
    if (beard) { const b = age >= 66 ? c("#dcd6cc") : dark(baseHair, 0.05); for (let y = my - 1; y <= chin; y++) { const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2))) - 1; for (let x = cx - half; x <= cx + half; x++) if (!(y === my && x >= cx - 1 && x <= cx + 1)) set(x, y, b); } rect(cx - 2, my - 1, 5, 1, b); }
  });

  return flatten();

  function babyFace(cx: number, cy: number) {
    const ey = cy + 1, lx = cx - 5, rx2 = cx + 3, sleepy = s % 5 === 0;
    if (sleepy) { for (const x0 of [lx, rx2]) { set(x0, ey + 1, eye); set(x0 + 1, ey + 2, eye); set(x0 + 2, ey + 1, eye); } }
    else { rect(lx, ey, 2, 3, eye); rect(rx2, ey, 2, 3, eye); set(lx, ey, c("#ffffff")); set(rx2, ey, c("#ffffff")); set(lx + 1, ey + 2, mix(eye, c("#ffffff"), 0.35)); set(rx2 + 1, ey + 2, mix(eye, c("#ffffff"), 0.35)); }
    rect(lx, ey - 2, 2, 1, mix(skin, baseHair, 0.3)); rect(rx2, ey - 2, 2, 1, mix(skin, baseHair, 0.3));
    set(cx - 1, ey + 3, shade); set(cx, ey + 3, mix(skin, shade, 0.5));
    ellipse(cx - 6.5, ey + 3.5, 2, 1, blush); ellipse(cx + 5.5, ey + 3.5, 2, 1, blush);
    const my = ey + 5, lip = mix(dark(skin, 0.28), c("#d9707c"), 0.5);
    if (age < 2 && s % 4 === 1) { const p = pick([c("#f3b6c4"), c("#a9cfe8"), c("#f6dc8c")], 9); ellipse(cx, my + 0.5, 3, 2, p); ellipse(cx, my + 0.5, 1.2, 0.8, lite(p, 0.5)); set(cx - 2, my - 1, lite(p, 0.35)); }
    else if (s % 3 === 2) { rect(cx - 1, my, 2, 2, mix(lip, eye, 0.25)); set(cx - 1, my, lip); }
    else { rect(cx - 1, my, 3, 1, lip); set(cx - 2, my - 1, lip); set(cx + 2, my - 1, lip); }
  }

  function drawBaby() {
    const cx = 20, cy = 24, onesie = pick(["#f6c9cf", "#c9def3", "#f7e3a8", "#cfe8cf", "#e2d4f2", "#f4d6b8"].map(c), 5);
    sprite(() => {
      ellipse(cx, 50, 16, 13, onesie);
      ellipse(cx + 6, 51, 10, 11, dark(onesie, 0.1));
      ellipse(cx - 7, 48, 4, 8, lite(onesie, 0.25));
      if (s % 2) { ellipse(cx, 40, 6, 3.5, c("#fbf6ec")); ellipse(cx, 40, 6, 3.5, c("#fbf6ec"), -Infinity, 41); set(cx - 3, 39, lite(c("#fbf6ec"), 0.5)); }
      else { set(cx - 1, 42, dark(onesie, 0.3)); set(cx + 1, 42, dark(onesie, 0.3)); }
      // Join the chin to a short neck and raised shoulders before drawing the face.
      rect(cx - 2, cy + 9, 5, 5, skin);
      rect(cx - 2, cy + 11, 5, 1, shade);
      ellipse(cx, cy + 13, 3, 1, skin);
      ellipse(cx - 11, cy + 1, 1.6, 2.2, skin); ellipse(cx + 11, cy + 1, 1.6, 2.2, shade);
      ellipse(cx, cy, 11, 10.5, skin);
      ellipse(cx - 6, cy + 4, 4.5, 3.6, skin); ellipse(cx + 6, cy + 4, 4.5, 3.6, skin);
      for (let y = cy - 1; y <= cy + 9; y++) { const half = 11 * Math.sqrt(Math.max(0, 1 - ((y - cy) / 10.5) ** 2)); set(cx + Math.floor(half), y, mix(skin, shade, 0.7)); }
      set(cx - 6, cy - 6, lite(skin, 0.14)); set(cx - 5, cy - 7, lite(skin, 0.14));
      if (age < 2 && s % 3 === 0) {
        const hat = pick(["#f2a7b5", "#9fc4e6", "#f4d27a", "#a8d3a8", "#c8b4e6"].map(c), 6);
        ellipse(cx, cy - 4, 12, 8.5, hat, -Infinity, cy - 3);
        rect(cx - 12, cy - 4, 25, 2, lite(hat, 0.25));
        for (let x = cx - 11; x <= cx + 11; x += 3) rect(x, cy - 10, 1, 6, dark(hat, 0.1));
        ellipse(cx, cy - 13, 2.6, 2.4, lite(hat, 0.35)); set(cx - 1, cy - 14, c("#ffffff"));
        rect(cx - 12, cy - 3, 3, 5, hat); rect(cx + 10, cy - 3, 3, 5, dark(hat, 0.1));
      } else {
        const soft = mix(hair, skin, age < 1 ? 0.55 : 0.35);
        ellipse(cx, cy - 7, 8, 3.5, soft, -Infinity, cy - 6);
        const curl = age < 1 ? mix(hair, skin, 0.25) : hair;
        set(cx, cy - 11, curl); set(cx + 1, cy - 12, curl); set(cx + 2, cy - 11, curl); set(cx + 1, cy - 10, curl); set(cx - 1, cy - 10, curl);
      }
      babyFace(cx, cy);
    });
  }

  function drawChild() {
    const cx = 20, cy = 21, rx = 9.5, ry = 9.5, young = age < 7;
    const tee = pick(["#e8735f", "#4f9bd6", "#f2c14e", "#5fb37c", "#9b7bd4", "#ef8fb1", "#3fa7a0"].map(c), 7);
    const kidStyle = (s >>> 3) % (female ? 5 : 3);
    sprite(() => {
      // Hair that falls behind the head.
      if (female && kidStyle === 3) ellipse(cx, cy + 4, rx + 2.5, ry + 7, dark(hair, 0.12), -Infinity, 40);
      if (female && kidStyle === 4) { rect(cx - rx - 2, cy, 3, 16, dark(hair, 0.1)); rect(cx + rx, cy, 3, 16, dark(hair, 0.15)); for (let y = cy + 1; y < cy + 16; y += 3) { set(cx - rx - 1, y, lite(hair, 0.2)); set(cx + rx + 1, y, lite(hair, 0.15)); } }
      // T-shirt with a stripe or a star.
      const top = cy + ry + 3;
      ellipse(cx, top + 12, 14, 12, tee);
      ellipse(cx + 5, top + 13, 9, 10, dark(tee, 0.14));
      ellipse(cx - 6, top + 11, 4, 8, lite(tee, 0.14));
      if (s % 2) { ellipse(cx, top + 12, 13, 12, lite(tee, 0.45), top + 8, top + 9); ellipse(cx + 5, top + 13, 8, 10, lite(tee, 0.3), top + 8, top + 9); }
      else { const st = c("#fff3c4"); set(cx, top + 5, st); rect(cx - 1, top + 6, 3, 1, st); set(cx - 1, top + 7, st); set(cx + 1, top + 7, st); }
      rect(cx - 2, cy + ry - 1, 5, 4, skin); rect(cx - 2, cy + ry - 1, 5, 1, shade);
      ellipse(cx, top + 0.5, 3.5, 1.4, skin, -Infinity, top + 1);
      // Head.
      ellipse(cx - rx - 0.5, cy + 1, 1.5, 2.2, skin); ellipse(cx + rx + 0.5, cy + 1, 1.5, 2.2, shade);
      ellipse(cx, cy, rx, ry, skin);
      if (young) { ellipse(cx - 5, cy + 4, 3.5, 3, skin); ellipse(cx + 5, cy + 4, 3.5, 3, skin); }
      for (let y = cy - 1; y <= cy + ry - 1; y++) { const half = rx * Math.sqrt(Math.max(0, 1 - ((y - cy) / ry) ** 2)); set(cx + Math.floor(half), y, mix(skin, shade, 0.7)); }
      set(cx - 6, cy - 4, lite(skin, 0.12)); set(cx - 5, cy - 5, lite(skin, 0.12));
      // Hair on top.
      if (!female && kidStyle === 1) ellipse(cx, cy - 4, rx + 0.5, ry - 4, mix(hair, skin, 0.3), -Infinity, cy - 5);
      else if (!female && kidStyle === 2) for (let a = 0; a < 9; a++) { const t = Math.PI + (a / 8) * Math.PI; ellipse(cx + Math.cos(t) * (rx - 1), cy - 3 + Math.sin(t) * (ry - 3), 2.5, 2.5, hair); }
      else {
        ellipse(cx, cy - 4, rx + 1, ry - 3, hair, -Infinity, cy - 4);
        // A fringe with an uneven edge reads as soft, cut hair rather than a helmet.
        for (let x = Math.round(cx - rx + 1); x <= cx + rx - 1; x++) { const d = (x + s) % 3 === 0 ? 2 : 1; rect(x, cy - 4, 1, d + (female && kidStyle === 1 ? 1 : 0), hair); }
        rect(cx - rx, cy - 4, 2, female ? 7 : 3, hair); rect(cx + rx - 1, cy - 4, 2, female ? 7 : 3, dark(hair, 0.1));
        if (!female) { set(cx + 2, cy - ry - 1, hair); set(cx + 3, cy - ry - 2, hair); }
      }
      ellipse(cx - 3, cy - ry + 2, 3, 1, lite(hair, 0.22), -Infinity, cy - ry + 2);
      if (female && kidStyle === 0) { for (const sx of [cx - rx - 2, cx + rx + 2]) { ellipse(sx, cy + 1, 2.6, 3.6, hair); set(sx, cy - 2, pick([c("#e4566b"), c("#f2c14e"), c("#5fa8d3")], 8)); set(sx + (sx < cx ? 1 : -1), cy - 2, pick([c("#e4566b"), c("#f2c14e"), c("#5fa8d3")], 8)); } }
      if (female && kidStyle === 2) { ellipse(cx + 6, cy - ry - 1, 3, 3, hair); set(cx + 4, cy - ry + 1, pick([c("#e4566b"), c("#5fa8d3")], 8)); ellipse(cx + 9, cy - ry + 3, 2, 4, hair); }
      // Face: big eyes with catchlights, brows, button nose, smile, rosy cheeks.
      const ey = cy, lx = cx - 4, rx2 = cx + 3;
      rect(lx, ey, 2, 3, eye); rect(rx2, ey, 2, 3, eye); set(lx, ey, c("#ffffff")); set(rx2, ey, c("#ffffff"));
      rect(lx - 1, ey - 2, 3, 1, dark(baseHair, 0.1)); rect(rx2, ey - 2, 3, 1, dark(baseHair, 0.1));
      set(cx, ey + 4, shade);
      ellipse(cx - 5.5, ey + 4, 1.6, 1, blush); ellipse(cx + 4.5, ey + 4, 1.6, 1, blush);
      const my = ey + 6, lip = mix(dark(skin, 0.3), c("#c95a66"), 0.4);
      rect(cx - 1, my, 3, 1, lip); set(cx - 2, my - 1, lip); set(cx + 2, my - 1, lip);
      if (s % 4 === 0) set(cx, my + 1, c("#ffffff"));
    });
  }

  function flatten() {
  // Group pixels into one path per colour.
  const byColor = new Map<number, string[]>();
  for (let y = 0; y < H; y++) for (let x = 0; x < W;) {
    const v = px[y * W + x]; let e = x + 1;
    while (e < W && px[y * W + e] === v) e++;
    if (v >= 0) { const d = byColor.get(v) ?? []; d.push(`M${x} ${y}h${e - x}v1h-${e - x}z`); byColor.set(v, d); }
    x = e;
  }
  return [...byColor].map(([v, d]) => ({ color: hex(v), d: d.join("") }));
  }
}
