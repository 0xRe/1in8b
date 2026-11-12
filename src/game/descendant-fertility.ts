import type { Country, Sex } from './types';
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
export function laterBirthAge(country: Country, sex: Sex, year?: number): number {
  const { id, region, cm, tfr } = country;
  let age = region === 'hi' ? (id === 'KOR' ? 31.5 : id === 'JPN' ? 29.7 : 30.5)
    : id === 'CHN' ? 28 : id === 'PHL' ? 24.75 : region === 'eca' ? 25.5
    : clamp(27 - cm * .15 - Math.max(0, tfr - 2) * .8, 16.5, 29.5);
  if (year !== undefined && year < 2020 && (region === 'hi' || region === 'eca' || id === 'CHN'))
    age = Math.max(region === 'eca' ? 21.5 : 21, age - clamp((2020-year)*.17, 0, 9));
  return age + (sex === 'M' ? 3 : 0);
}
export function fertilityAt(tfr: number, year: number): number {
  const elapsed = Math.max(0, year - 2025);
  return tfr > 1.9 ? 1.9 + (tfr-1.9)*Math.exp(-elapsed/45)
    : tfr < 1.5 ? 1.5 - (1.5-tfr)*Math.exp(-elapsed/50) : tfr;
}
/** A zero target is persistent; the remaining distribution is 1 + capped Poisson. */
export function fertilityTarget(country: Country, tfr: number, random: () => number): number {
  if (random() < (['hi','eca'].includes(country.region) ? .17 : .07)) return 0;
  const cutoff = Math.exp(-Math.max(.2,tfr*1.05-1));
  let product = 1;
  for (let target = 1; target < 9; target++) {
    product *= random();
    if (product <= cutoff) return target;
  }
  return 9;
}
