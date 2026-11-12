import { lifeTable } from '../game/engine';
import type { Focus, Life } from '../game/types';

export function lifeInsights(life: Life) {
  const adultYears = life.history.filter(row => row.age >= 18 && row.annual !== null && (row.annual.completed === true || row.age < life.age && row.annual.completed !== false));
  const adultFocusYears: Record<Focus, number> = { balanced: 0, health: 0, knowledge: 0, career: 0, relationships: 0, creativity: 0 };
  for (const year of adultYears) {
    const record = year.annual!;
    if (record.focusWeights) for (const [focus, weight] of Object.entries(record.focusWeights)) adultFocusYears[focus as Focus] += weight;
    else adultFocusYears[record.focus]++;
  }
  for (const focus of Object.keys(adultFocusYears) as Focus[]) adultFocusYears[focus] = Math.round(adultFocusYears[focus] * 100) / 100;
  const priorJob = [...life.history].reverse().find(row => row.annual && !['none', 'student', 'retired'].includes(row.annual.job))?.annual?.job;
  const currentJob = !['none', 'student', 'retired'].includes(life.stats.job) ? life.stats.job : null;
  const birthCountry = life.migration.birthCountry;
  const table = lifeTable(birthCountry, life.sex);
  return {
    lastJob: currentJob ?? life.career.at(-1)?.job ?? priorJob ?? null,
    partneredYears: adultYears.filter(row => row.annual!.partner).length,
    adultFocusYears, recordedAdultYears: adultYears.length,
    missingAdultYears: Math.max(0, life.age - 18 - adultYears.length),
    happiestYear: life.history.reduce<typeof life.history[number] | null>((best, year) => !best || year.happiness > best.happiness ? year : best, null),
    countries: [...new Set([birthCountry.id, ...life.migration.moves.map(move => move.country), life.country.id])],
    cohortSurvival: table.survival[Math.min(life.age, 110)] ?? 0,
    cohortExpectancy: table.expectancy, birthCountry,
    recordedYears: life.history.filter(row => row.annual !== null).length,
  };
}

/** Names are independently authored; these describe a simulated life, never a personality diagnosis. */
export const GRAIN_NAMES = [
  'The familiar hearth', 'The patient gardener', 'The gathering spark', 'The neighborhood maker',
  'The traveling table', 'The faraway home', 'The wandering chorus', 'The crossing keeper',
  'The daily craft', 'The enduring workshop', 'The restless maker', 'The returning architect',
  'The portable craft', 'The distant foundation', 'The open horizon', 'The pathfinder',
] as const;
export const GRAIN_PAIRS = [['Together', 'Work'], ['Roots', 'Wind'], ['Stillness', 'Waves'], ['Today', 'Tomorrow']] as const;
const percent = (value: number) => Math.round(Math.max(0, Math.min(100, value)));
export function lifeGrain(life: Life) {
  const info = lifeInsights(life);
  const years = life.history.filter(row => row.age >= 18 && row.annual !== null && (row.annual.completed === true || row.age < life.age && row.annual.completed !== false));
  const n = years.length;
  const focus = info.adultFocusYears;
  const work = focus.career, together = focus.relationships;
  const away = years.filter(row => row.annual!.country !== info.birthCountry.id).length;
  const exposed = years.filter(row => ['stocks', 'business'].includes(row.annual!.allocation)).length;
  let transitions = 0;
  for (let i = 1; i < years.length; i++) {
    const a = years[i - 1], b = years[i];
    if (b.age !== a.age + 1) continue;
    if (a.annual!.job !== b.annual!.job || a.annual!.country !== b.annual!.country || Math.abs(a.health - b.health) >= 10 || Math.abs(a.happiness - b.happiness) >= 10) transitions++;
  }
  const saving = years.filter(row => row.annual!.income > 0 && row.annual!.annualSavings > row.annual!.income * .1).length;
  const study = focus.knowledge;
  const scores = [
    work + together ? percent(100 * work / (work + together)) : 50,
    n ? percent(100 * away / n) : 50,
    n ? percent(50 * exposed / n + 250 * transitions / n) : 50,
    n ? percent(100 * Math.min(n, saving + study) / n) : 50,
  ];
  const evidence = [
    `${together} completed adult years focused on relationships; ${work} on career. Other focuses are neutral on this pair.`,
    `${away} of ${n} recorded adult years lived outside the birth country.`,
    `${exposed} years with stocks or business allocation; ${transitions} adjacent years with a job or country change, or a health or happiness change of at least 10 points.`,
    `${saving} years saving more than 10% of annual income; ${study} years focused on knowledge. Counts may overlap; the score is capped.`,
  ];
  const evidenceParams: Record<string, string | number>[] = [{ together, work }, { away, years: n }, { exposed, transitions }, { saving, study }];
  const axes = GRAIN_PAIRS.map((pair, index) => ({ evidenceKey: `grain.evidence${index}`, evidenceParams: evidenceParams[index], left: pair[0], right: pair[1], score: scores[index], evidence: evidence[index], balanced: scores[index] >= 40 && scores[index] <= 60 }));
  const index = scores.reduce((value, score) => value * 2 + Number(score > 50), 0);
  const insufficient = n < 3;
  const mixed = axes.filter(axis => axis.balanced).length >= 2;
  return { index, nameKey: insufficient ? 'grain.unmeasured' : mixed ? 'grain.many' : `grain.name${index}`, name: insufficient ? 'A life beyond these measures' : mixed ? 'A grain with many directions' : GRAIN_NAMES[index], axes, mixed, insufficient, recordedAdultYears: n, missingAdultYears: info.missingAdultYears };
}
