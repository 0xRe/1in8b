import { decodeSave, encodeSave } from "../game/storage";
import type { Life } from "../game/types";
import { loadFilmSettings, normalizeFilmSettings } from "./film-model";
import { readRoom, normalizeRoom } from "./room-data";
import { readJournal, normalizeJournal } from "./game-feedback";
export function exportBackup(life: Life | null, past: Life[]) {
  const base = JSON.parse(encodeSave(life, past));
  base.rooms = Object.fromEntries(
    [...past, ...(life ? [life] : [])].map((l) => [l.id, readRoom(l.id)]),
  );
  base.films = Object.fromEntries([...past, ...(life ? [life] : [])].map(l => [l.id, loadFilmSettings(l)]));
  base.journals = Object.fromEntries([...past, ...(life ? [life] : [])].map(l => [l.id, normalizeJournal(readJournal(l.id), l)]));
  const text = JSON.stringify(base);
  if (new TextEncoder().encode(text).byteLength > 10_000_000)
    throw new Error("Backup exceeds10MB");
  return text;
}
export function importBackup(text: string) {
  const data = decodeSave(text),
    raw = JSON.parse(text);
  const rooms =
    raw.rooms && typeof raw.rooms === "object" && !Array.isArray(raw.rooms)
      ? raw.rooms
      : {};
  // Decode and normalize everything before persistence can mutate either store.
  const metadata: [string,string][] = [];
  for (const life of [...data.past, ...(data.life ? [data.life] : [])])
    if (Object.prototype.hasOwnProperty.call(rooms, life.id))
      metadata.push([`1in8bn-room-${life.id}`,JSON.stringify(normalizeRoom(rooms[life.id]))]);
  const films = raw.films && typeof raw.films === "object" && !Array.isArray(raw.films) ? raw.films : {};
  for (const life of [...data.past, ...(data.life ? [data.life] : [])])
    if (Object.prototype.hasOwnProperty.call(films, life.id))
      metadata.push([`1in8bn-film-${life.id}`,JSON.stringify(normalizeFilmSettings(films[life.id], life))]);
  const journals = raw.journals && typeof raw.journals === "object" && !Array.isArray(raw.journals) ? raw.journals : {};
  for (const life of [...data.past, ...(data.life ? [data.life] : [])])
    if (Object.prototype.hasOwnProperty.call(journals, life.id))
      metadata.push([`1in8bn-choices-${life.id}`,JSON.stringify(normalizeJournal(journals[life.id], life))]);
  return {...data,metadata};
}
