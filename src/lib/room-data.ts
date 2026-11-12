import { SCENE_KINDS, type SceneKind } from "./pixel-art";
export const FURNITURE = [
  "empty",
  "table",
  "chair",
  "plant",
  "bed",
  "sofa",
  "desk",
  "piano",
  "tv",
  "bookshelf",
  "clock",
  "lamp",
  "picture",
  "rug",
  "armchair", "stool", "bench", "diningTable", "coffeeTable",
  "wardrobe", "dresser", "cabinet", "fridge", "stove", "sink",
  "computer", "radio", "recordPlayer", "guitar", "violin", "drums",
  "easel", "canvas", "flowers", "plantTall", "bonsai", "aquarium",
  "catBed", "dogBed", "bicycle", "telescope", "globe", "calendar", "mirror", "fireplace",
] as const;
export const ROOM_OPTIONS = {
  wall: ["cream", "blue", "stripes", "dots", "gingham", "whiteTiles", "flowers", "woodPanels", "brick", "hanji", "starry"],
  floor: ["wood", "ondol", "tatami", "tiles", "carpet", "marble"],
  window: ["countryside", "city", "forest", "rain", "cityNight", "sea", "snow", "blossoms", "night", "summer", "autumn", "sunset", "moon", "fireflies", "snowNight"],
  clothes: ["everyday", "navy", "red", "yellow", "white", "pink", "green", "black"],
  music: ["default", "musicBox", "waltz", "rainyPiano", "nightSky", "springWalk"],
  people: ["alone", "family"],
} as const;
export type Item = (typeof FURNITURE)[number];
export type Room = {
  wall: string;
  floor: string;
  window: string;
  items: Item[];
  clothes: string;
  music: string;
  people: string;
  occupants: number;
  title: string;
  words: string;
  captions: Record<string, string>;
};
export type AlbumScene = {
  age: number;
  year: number;
  text: string;
  caption: string;
  scene?: { kind: SceneKind; seed: number; sex: "M"|"F" };
};
export const DEFAULT_ROOM: Room = {
  clothes: "everyday",
  music: "default",
  people: "alone",
  occupants: 1,
  wall: "cream",
  floor: "wood",
  window: "forest",
  items: [
    "table",
    "sofa",
    "plant",
    "bookshelf",
    "rug",
    "picture",
    "clock",
    "picture",
  ],
  title: "",
  words: "",
  captions: {},
};
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const text = (v: unknown, n: number) =>
  typeof v === "string" ? v.slice(0, n) : "";
export function normalizeRoom(value: unknown): Room {
  const r = record(value) ? value : {};
  const choice = (key: string, allowed: readonly string[], fallback: string) =>
    typeof r[key] === "string" && allowed.includes(r[key]) ? r[key] : fallback;
  const captions: Record<string, string> = Object.create(null);
  if (record(r.captions))
    for (const [key, value] of Object.entries(r.captions).slice(0, 1500))
      if (key.length < 160 && typeof value === "string")
        captions[key] = value.slice(0, 240);
  return {
    wall: choice("wall", ROOM_OPTIONS.wall, "cream"),
    floor: choice("floor", ROOM_OPTIONS.floor, "wood"),
    window: choice("window", ROOM_OPTIONS.window, "forest"),
    clothes: choice("clothes", ROOM_OPTIONS.clothes, "everyday"),
    music: choice("music", ROOM_OPTIONS.music, "default"),
    people: choice("people", ROOM_OPTIONS.people, "alone"),
    occupants: typeof r.occupants === "number" && Number.isFinite(r.occupants) ? Math.max(1, Math.min(6, Math.floor(r.occupants))) : 1,
    items:
      Array.isArray(r.items) && r.items.length === 8
        ? r.items.map((v) => (FURNITURE.includes(v) ? v : "empty"))
        : [...DEFAULT_ROOM.items],
    title: text(r.title, 80),
    words: text(r.words, 400),
    captions,
  };
}
export function readRoom(id: string): Room {
  try {
    return normalizeRoom(
      JSON.parse(localStorage.getItem(`1in8bn-room-${id}`) || "null"),
    );
  } catch {
    return normalizeRoom(null);
  }
}
export function normalizeAlbum(value: unknown): AlbumScene[] {
  return Array.isArray(value)
    ? value
        .slice(0, 30)
        .filter(record)
        .filter(
          (v) =>
            Number.isInteger(v.age) &&
            Number(v.age) >= 0 &&
            Number(v.age) <= 110 &&
            Number.isInteger(v.year),
        )
        .map((v) => ({
          age: Number(v.age),
          year: Number(v.year),
          text: text(v.text, 600),
          caption: text(v.caption, 240),
          ...(record(v.scene)&&SCENE_KINDS.includes(v.scene.kind as SceneKind)&&Number.isInteger(v.scene.seed)&&Number(v.scene.seed)>=0&&Number(v.scene.seed)<=4294967295&&(v.scene.sex==="M"||v.scene.sex==="F")?{scene:{kind:v.scene.kind as SceneKind,seed:Number(v.scene.seed),sex:v.scene.sex}}:{}),
        }))
    : [];
}
