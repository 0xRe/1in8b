import type { Sex } from './types';
/** Calendar-year representation; source rules use player ages instead. */
export interface ChildSentence {
  startYear: number;
  endYear: number;
  releasedYear: number | null;
  reunion?: {choice: "welcome" | "time"; year: number; reconciledYear: number | null};
}
export interface ChildPrisonContext {
  playerAge: number;
  playerImprisoned: boolean;
  householdPercentile: number;
  playerPrisonHistory: boolean;
  country: string;
  childAge: number;
  sex: Sex;
  alive: boolean;
  priorSentence: boolean;
  placement: boolean;
  abroad: boolean;
  weddingThisYear: boolean;
  sentencedChildren: number;
}
const prisonRates: Record<string, number> = {
  USA:540, BRA:390, THA:400, TUR:380, RUS:300, ZAF:250, IRN:230,
  MEX:170, CHN:120, KOR:105, JPN:35, IND:40, NGA:37, PAK:40, BGD:45,
};
/** Eligibility is evaluated before any random draw, preserving deterministic streams. */
export function childPrisonChance(context: ChildPrisonContext): number {
  const c = context;
  if (c.playerAge < 36 || c.playerImprisoned || c.sentencedChildren >= 2 ||
      !c.alive || c.priorSentence || c.placement || c.abroad || c.weddingThisYear ||
      c.childAge < 18 || c.childAge > 45) return 0;
  const quintile = Math.max(1, Math.min(5, Math.ceil(c.householdPercentile * 5)));
  const householdFactor = [1.6, 1.25, 1, 0.75, 0.55][quintile - 1];
  return 0.0006 * ((prisonRates[c.country] ?? 140) / 140) * householdFactor *
    (c.playerPrisonHistory ? 1.3 : 1) * (c.sex === 'M' ? 1 : 0.08);
}
export function drawChildSentence(random: () => number): number {
  const draw = random();
  return draw < 0.35 ? 1 : draw < 0.65 ? 2 : draw < 0.8 ? 3 : draw < 0.9 ? 4 : 6;
}
export function childImprisoned(alive: boolean, sentence: ChildSentence | undefined, year: number): boolean {
  return !!(alive && sentence && (year < sentence.endYear ||
    (year === sentence.endYear && sentence.releasedYear === null)));
}
export function childUniversityEndAge(birthYear: number, sentence: ChildSentence | undefined): number {
  return 23 + (sentence && sentence.startYear - birthYear < 23 ? sentence.endYear - sentence.startYear : 0);
}
