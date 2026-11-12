import type { GameEvent, Life } from "../game/types";
import { keepsakePreferences } from "./keepsake-preferences";
export const MUSIC_TRACKS = ["piano", "warm", "rain", "hope", "night", "silent"] as const;
export const FILM_MOODS = ["paper", "sepia", "midnight"] as const;
export type FilmSettings = {
  title: string; words: string; sceneIds: string[]; captions: Record<string,string>;
  music: typeof MUSIC_TRACKS[number]; mood: typeof FILM_MOODS[number];
};
export type FilmFormat = "film" | "teaser" | "epilogue";
export const FORMAT_SECONDS: Record<FilmFormat,number> = {film:100,teaser:20,epilogue:22};
export const FILM_EPILOGUE_START = FORMAT_SECONDS.film - FORMAT_SECONDS.epilogue;

export function defaultScenes(life:Life):GameEvent[] {
  const candidates=life.events.filter(e=>e.kind!=="everyday"&&e.kind!=="finance");
  const meaningful=candidates.filter(e=>e.key!=="event.choice");
  // Keep meaningful memories first; generic decisions only fill an otherwise short life.
  const pool=(meaningful.length>=10?meaningful:[
    ...meaningful,...candidates.filter(e=>e.key==="event.choice").slice(0,10-meaningful.length),
  ]).sort((a,b)=>a.age-b.age);
  if(pool.length<=10)return pool;
  return Array.from({length:10},(_,i)=>pool[Math.round(i*(pool.length-1)/9)]);
}
export function normalizeFilmSettings(value:unknown, life:Life):FilmSettings {
  const v=value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
  const valid=new Set(life.events.map(e=>e.id));
  const ids=Array.isArray(v.sceneIds)?[...new Set(v.sceneIds.filter((id):id is string=>typeof id==="string"&&valid.has(id)))].slice(0,10):[];
  const captions:Record<string,string>=Object.create(null);
  if(v.captions&&typeof v.captions==="object"&&!Array.isArray(v.captions))for(const [key,text]of Object.entries(v.captions).slice(0,1500))if(valid.has(key)&&typeof text==="string")captions[key]=text.slice(0,240);
  return {
    title:typeof v.title==="string"?v.title.slice(0,80):life.name,
    words:typeof v.words==="string"?v.words.slice(0,400):"",
    sceneIds:ids.length?ids:defaultScenes(life).map(e=>e.id),captions,
    music:MUSIC_TRACKS.includes(v.music as FilmSettings["music"])?v.music as FilmSettings["music"]:"piano",
    mood:FILM_MOODS.includes(v.mood as FilmSettings["mood"])?v.mood as FilmSettings["mood"]:"paper",
  };
}
export function selectedScenes(life:Life,settings:FilmSettings):GameEvent[] {
  const ids=new Set(settings.sceneIds);
  return life.events.filter(e=>ids.has(e.id)).sort((a,b)=>a.age-b.age).slice(0,10);
}
export function loadFilmSettings(life:Life):FilmSettings {
  let saved:unknown;
  try{saved=JSON.parse(localStorage.getItem(`1in8bn-film-${life.id}`)||"null");}
  catch{saved=null;}
  if(saved&&typeof saved==="object"&&!Array.isArray(saved))return normalizeFilmSettings(saved,life);
  const room=keepsakePreferences(life.id);
  return normalizeFilmSettings({...room,title:room.title||life.name},life);
}
export function saveFilmSettings(life:Life,settings:FilmSettings) {
  localStorage.setItem(`1in8bn-film-${life.id}`,JSON.stringify(normalizeFilmSettings(settings,life)));
}
