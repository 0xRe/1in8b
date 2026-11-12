import { getCountries } from './countries';
import { lifeTable } from './engine';
import type { Sex } from './types';

let cachedWorldSurvival: Record<Sex, number[]> | null = null;

/** Population-weighted world survival curve per sex (0 to 100 years). */
export function worldSurvivalCurve(sex: Sex): number[] {
  if (cachedWorldSurvival?.[sex]?.length) return cachedWorldSurvival[sex];
  const countries = getCountries();
  let totalPop = 0;
  const totals = new Array(101).fill(0);
  for (const c of countries) {
    const table = lifeTable(c, sex);
    totalPop += c.pop;
    for (let i = 0; i < Math.min(101, table.survival.length); i++) {
      totals[i] += table.survival[i] * c.pop;
    }
  }
  const curve = totals.map(v => Math.round((v / (totalPop || 1)) * 1000) / 10);
  if (!cachedWorldSurvival) {
    cachedWorldSurvival = { M: [], F: [] };
  }
  cachedWorldSurvival[sex] = curve;
  return curve;
}
