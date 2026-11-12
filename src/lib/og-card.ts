import { pixelScene } from './pixel-art';
import { portraitPaths } from './portrait';
import type { LifeShareCode } from './life-share';

/**
 * Link-preview image for a shared life (1200×630 PNG), rasterised without a canvas so the
 * Worker can draw it: the person's portrait on a paper panel beside the life's own pixel scene. Text stays in og:title, where every chat app renders it in the reader's font.
 */
export const OG_WIDTH = 1200, OG_HEIGHT = 630;

const rgb = (color: string): [number, number, number] => {
  const hex = color.replace('#', '');
  const full = hex.length === 3 ? hex.split('').map(c => c + c).join('') : hex.slice(0, 6);
  const n = parseInt(full, 16);
  return Number.isFinite(n) ? [n >> 16 & 255, n >> 8 & 255, n & 255] : [0, 0, 0];
};

export function lifeCardPixels(code: LifeShareCode): Uint8Array {
  const w = OG_WIDTH, h = OG_HEIGHT, px = new Uint8Array(w * h * 3);
  const fill = (x0: number, y0: number, x1: number, y1: number, [r, g, b]: [number, number, number]) => {
    const ax = Math.max(0, Math.round(x0)), bx = Math.min(w, Math.round(x1)), ay = Math.max(0, Math.round(y0)), by = Math.min(h, Math.round(y1));
    for (let y = ay; y < by; y++) for (let i = (y * w + ax) * 3, end = (y * w + bx) * 3; i < end; i += 3) { px[i] = r; px[i + 1] = g; px[i + 2] = b; }
  };
  // The life's scene fills the right of the frame: 320×180 at 3.5× is 1120×630, cropped to its centre.
  const panel = 360, k = h / 180, left = panel - (320 * k - (w - panel)) / 2;
  const scene = pixelScene({ seed: code.seed, age: code.sceneAge, sex: code.sex, birthYear: code.birthYear, alive: true, residence: 'urban', pets: [], stats: { job: 'none' }, family: { partner: null, marriageAge: null, children: [] } }, undefined, code.kind);
  for (const r of scene.rects) fill(Math.max(panel, left + r.x * k), r.y * k, Math.max(panel, left + (r.x + r.w) * k), (r.y + r.h) * k, rgb(r.color));
  // Paper panel on the left holds the portrait, so it never covers the person in the scene.
  fill(0, 0, panel, h, [244, 241, 235]);
  fill(panel - 4, 0, panel, h, [217, 214, 205]);
  fill(0, 0, w, 8, [170, 64, 45]);
  const scale = 6, pw = 40 * scale, ph = 48 * scale, mount = 14, x = (panel - pw) / 2, y = (h - ph) / 2 + 4;
  fill(x - mount - 2, y - mount - 2, x + pw + mount + 2, y + ph + mount + 2, [217, 214, 205]);
  fill(x - mount, y - mount, x + pw + mount, y + ph + mount, [255, 253, 248]);
  fill(x, y, x + pw, y + ph, [236, 230, 216]);
  for (const path of portraitPaths({ seed: code.seed, age: code.age, sex: code.sex })) {
    const color = rgb(path.color);
    for (const m of path.d.matchAll(/M(\d+) (\d+)h(\d+)/g)) fill(x + Number(m[1]) * scale, y + Number(m[2]) * scale, x + (Number(m[1]) + Number(m[3])) * scale, y + (Number(m[2]) + 1) * scale, color);
  }
  return px;
}

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; }
  return table;
})();
const crc32 = (bytes: Uint8Array) => { let c = 0xffffffff; for (const b of bytes) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

async function zlib(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new CompressionStream('deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Encodes 8-bit RGB pixels as a PNG (filter 0 per row; flat pixel art compresses well). */
export async function encodePng(pixels: Uint8Array, width: number, height: number): Promise<Uint8Array> {
  const raw = new Uint8Array(height * (width * 3 + 1));
  for (let y = 0; y < height; y++) raw.set(pixels.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1);
  const chunk = (type: string, body: Uint8Array) => {
    const out = new Uint8Array(12 + body.length), view = new DataView(out.buffer);
    view.setUint32(0, body.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(body, 8);
    view.setUint32(8 + body.length, crc32(out.subarray(4, 8 + body.length)));
    return out;
  };
  const header = new Uint8Array(13), hv = new DataView(header.buffer);
  hv.setUint32(0, width); hv.setUint32(4, height); header[8] = 8; header[9] = 2;
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', await zlib(raw)), chunk('IEND', new Uint8Array())];
  const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const part of parts) { png.set(part, offset); offset += part.length; }
  return png;
}

export async function lifeCardPng(code: LifeShareCode): Promise<Uint8Array> {
  return encodePng(lifeCardPixels(code), OG_WIDTH, OG_HEIGHT);
}
