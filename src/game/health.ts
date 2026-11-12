import { getCountries } from './countries';
import type { CareLevel, Healthcare, HealthEpisode, HealthTreatment, Life } from './types';

const countries = new Map(getCountries().map(country => [country.id, country]));

export const HEALTH_TREATMENTS: HealthTreatment[] = ['intensiveCare', 'localCare', 'supportiveCare'];
export const FOLLOWUP_TREATMENTS: HealthTreatment[] = ['attendFollowup', 'skipFollowup'];
export function emptyHealthcare(): Healthcare {
  return { episodes: [], activeEpisodeId: null, chronic: [], lastCheckedAge: -1, childChecks: [], totalOutOfPocket: 0 };
}
export function getHealthSummary(life: Life) {
  return {
    active: life.healthcare.episodes.find(episode => episode.id === life.healthcare.activeEpisodeId) ?? null,
    recovering: life.healthcare.episodes.filter(episode => episode.status === 'recovering'),
    conditions: life.healthcare.chronic,
    totalOutOfPocket: life.healthcare.totalOutOfPocket,
  };
}
export function healthDecisionKey(level: CareLevel): string {
  return `decision.${({ clinic: 'healthClinic', hospital: 'healthHospital', icu: 'healthIcu', neonatal: 'healthNeonatal', followup: 'healthFollowup' })[level]}`;
}
/** Gameplay estimates in the same purchasing-power units as the life budget, not medical prices. */
export function treatmentCost(life: Life, episode: HealthEpisode, treatment: string): number {
  if (treatment === 'skipFollowup') return 0;
  const country = countries.get(episode.country)!;
  const factor = ({ clinic: 0.018, hospital: 0.09, icu: 0.35, neonatal: 0.28, followup: 0.012 })[episode.level];
  const treatmentFactor = treatment === 'intensiveCare' ? 1 : treatment === 'localCare' ? 0.5 : treatment === 'supportiveCare' ? 0.12 : 1;
  const coverage = life.lifestyle.insurance === 'full' ? 0.16 : 0.3 + country.oop / 100 * 0.7;
  const era = life.era === 'past' ? 0.65 : life.era === 'future' ? 1.35 : 1;
  return Math.round(Math.max(1, country.ppp * factor * treatmentFactor * coverage * era) * 100) / 100;
}
