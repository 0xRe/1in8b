import type { Choice, Life } from "../game/types";

/** What a decision visibly changed, shown to the player right after choosing. */
export interface Consequence {
  id: string;
  choiceKey: string;
  choiceParams: Choice["params"];
  stats: { key: "health" | "happiness" | "knowledge" | "social"; delta: number }[];
  savings: number;
  income: number;
  job: string | null;
}

const STAT_KEYS = ["health", "happiness", "knowledge", "social"] as const;

export function describeConsequence(before: Life, after: Life, choice: Choice): Consequence {
  const stats = STAT_KEYS.map((key) => ({ key, delta: Math.round(after.stats[key] - before.stats[key]) })).filter((s) => s.delta !== 0);
  const savings = Math.round(after.stats.savings - before.stats.savings);
  const income = Math.round(after.stats.annualIncome - before.stats.annualIncome);
  const job = after.stats.job !== before.stats.job && after.stats.job !== "none" ? after.stats.job : null;
  return { id: `${before.id}:${before.pendingDecision?.id ?? choice.id}:${choice.id}`, choiceKey: choice.key, choiceParams: choice.params, stats, savings, income, job };
}

/** Life chapters give a long simulation a rhythm; each starts at the listed age. */
export const CHAPTERS = [
  { age: 0, key: "feel.chapter.early" },
  { age: 6, key: "feel.chapter.school" },
  { age: 13, key: "feel.chapter.teen" },
  { age: 18, key: "feel.chapter.adult" },
  { age: 30, key: "feel.chapter.building" },
  { age: 50, key: "feel.chapter.middle" },
  { age: 65, key: "feel.chapter.later" },
] as const;

/** Returns the chapter a life enters when it moves from one age to the next, if any. */
export function chapterCrossed(previousAge: number, age: number) {
  if (age <= previousAge) return null;
  const index = CHAPTERS.findIndex((chapter) => chapter.age > previousAge && chapter.age <= age);
  return index > 0 ? { number: index + 1, key: CHAPTERS[index].key, age: CHAPTERS[index].age } : null;
}

/**
 * Early childhood has few decisions (one at age 2, then school at 6), and play data showed
 * 31% of new lives were abandoned before the first choice. Quiet years before school pass
 * faster; from age 6 the player's own speed applies unchanged.
 */
export const OPENING_TEMPO = 2.5;
/**
 * After the age-7 hobby choice, decisions were nearly absent until 12 (102 at 7, then 19, 6, 6
 * and 2 at ages 8–11, 47 at 12), and players who left between chapters 6 and 18 most often
 * stopped right there. Quiet primary-school years also pass faster.
 */
export const CHILDHOOD_TEMPO = 2;
export function openingTempo(life: Pick<Life, "age" | "pendingDecision">, fastForward = false) {
  if (fastForward || life.pendingDecision) return 1;
  if (life.age < 6) return OPENING_TEMPO;
  return life.age >= 7 && life.age < 12 ? CHILDHOOD_TEMPO : 1;
}

/** The player's own decisions for one life, kept on this device so the record can name them. */
export interface JournalEntry { eventId: string; age: number; decisionKey: string; decisionParams: Choice["params"]; choiceKey: string; choiceParams: Choice["params"] }
const journalKey = (lifeId: string) => `1in8bn-choices-${lifeId}`;
/** Imported annotations can describe only actual decisions in this life. */
export function normalizeJournal(value: unknown, life: Life): JournalEntry[] {
  if (!Array.isArray(value)) return [];
  const events = new Map(life.events.filter(event => event.key === "event.decision").map(event => [event.id, event]));
  const key = (value: unknown): value is string => typeof value === "string" && /^[a-zA-Z0-9_.-]{1,160}$/.test(value);
  const params = (value: unknown): value is Choice["params"] => !!value && typeof value === "object" && !Array.isArray(value) && Object.entries(value).length <= 32 && Object.entries(value).every(([name, item]) => key(name) && !["__proto__", "constructor", "prototype"].includes(name) && (typeof item === "string" && item.length <= 1000 || typeof item === "number" && Number.isFinite(item) && Math.abs(item) <= 1e15));
  const entries = new Map<string, JournalEntry>();
  for (const entry of value.slice(-200)) {
    if (!entry || typeof entry !== "object" || !events.has(entry.eventId) || !Number.isInteger(entry.age) || entry.age < 0 || entry.age > life.age || entry.age !== events.get(entry.eventId)!.age || !key(entry.decisionKey) || !key(entry.choiceKey) || !params(entry.decisionParams) || !params(entry.choiceParams)) continue;
    entries.set(entry.eventId, {eventId: entry.eventId, age: entry.age, decisionKey: entry.decisionKey, decisionParams: {...entry.decisionParams}, choiceKey: entry.choiceKey, choiceParams: {...entry.choiceParams}});
  }
  return [...entries.values()];
}
export function readJournal(lifeId: string): JournalEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(journalKey(lifeId)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((e) => e && typeof e.eventId === "string" && typeof e.choiceKey === "string") : [];
  } catch {
    return [];
  }
}
export function recordChoice(before: Life, after: Life, choice: Choice) {
  const decision = before.pendingDecision, event = [...after.events].reverse().find((e) => e.key === "event.decision" && !before.events.some((b) => b.id === e.id));
  if (!decision || !event) return;
  try {
    const entries = [...readJournal(before.id), { eventId: event.id, age: before.age, decisionKey: decision.key, decisionParams: decision.params, choiceKey: choice.key, choiceParams: choice.params }].slice(-200);
    localStorage.setItem(journalKey(before.id), JSON.stringify(entries));
  } catch {
    /* A full or blocked store only loses the annotation, never the game. */
  }
}
