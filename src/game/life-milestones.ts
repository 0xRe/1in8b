import type { Life } from './types';

export type MilestoneType = 'bereavement' | 'school' | 'love' | 'birth' | 'career' | 'death';

export interface YearMilestone {
  age: number;
  type: MilestoneType;
  symbol: string; // '†' | 'S' | '♥' | '+' | '★'
  labelKey: string;
  params?: Record<string, any>;
}

/**
 * Returns milestone markers for each year of a life, prioritizing significant lifecycle events
 * (death of self/family, birth of children, marriage/romance, educational transitions, and career moments).
 */
export function getLifeMilestones(life: Life): Map<number, YearMilestone> {
  const milestones = new Map<number, YearMilestone>();

  // 1. Career / job milestones
  for (const e of life.events) {
    const k = e.key.toLowerCase();
    if (k.includes('job') || k.includes('career') || k.includes('promot') || k.includes('hired') || k.includes('work')) {
      if (!milestones.has(e.age)) {
        milestones.set(e.age, {
          age: e.age,
          type: 'career',
          symbol: '★',
          labelKey: e.key,
          params: e.params,
        });
      }
    }
  }

  // 2. School / Education
  for (const e of life.events) {
    const k = e.key.toLowerCase();
    if (k.includes('school') || k.includes('graduat') || k.includes('university') || k.includes('college') || k.includes('degree') || k.includes('enrolled') || k.includes('education')) {
      const existing = milestones.get(e.age);
      if (!existing || existing.type === 'career') {
        milestones.set(e.age, {
          age: e.age,
          type: 'school',
          symbol: 'S',
          labelKey: e.key,
          params: e.params,
        });
      }
    }
  }

  // 3. Romance / Marriage
  if (life.family.marriageAge !== null && life.family.marriageAge <= life.age) {
    milestones.set(life.family.marriageAge, {
      age: life.family.marriageAge,
      type: 'love',
      symbol: '♥',
      labelKey: 'ui.marriageMilestone',
      params: { partner: life.family.partner?.name || '' },
    });
  }
  for (const e of life.events) {
    const k = e.key.toLowerCase();
    if (k.includes('marri') || k.includes('wedding') || k.includes('partner') || k.includes('fellinlove') || k.includes('dating')) {
      const existing = milestones.get(e.age);
      if (!existing || existing.type === 'career' || existing.type === 'school') {
        milestones.set(e.age, {
          age: e.age,
          type: 'love',
          symbol: '♥',
          labelKey: e.key,
          params: e.params,
        });
      }
    }
  }

  // 4. Children born
  for (const e of life.events) {
    const k = e.key.toLowerCase();
    if (k.includes('child') || k.includes('baby') || k.includes('birth') || k.includes('daughter') || k.includes('son')) {
      const existing = milestones.get(e.age);
      if (!existing || existing.type === 'career' || existing.type === 'school' || existing.type === 'love') {
        milestones.set(e.age, {
          age: e.age,
          type: 'birth',
          symbol: '+',
          labelKey: e.key,
          params: e.params,
        });
      }
    }
  }

  // 5. Family Bereavement
  for (const e of life.events) {
    const k = e.key.toLowerCase();
    if (k.includes('died') || k.includes('death') || k.includes('loss') || k.includes('funeral') || e.icon === '†') {
      milestones.set(e.age, {
        age: e.age,
        type: 'bereavement',
        symbol: '†',
        labelKey: e.key,
        params: e.params,
      });
    }
  }

  // 6. Character's own death
  if (!life.alive && life.deathAge !== null) {
    milestones.set(life.deathAge, {
      age: life.deathAge,
      type: 'death',
      symbol: '†',
      labelKey: life.cause || 'event.death',
    });
  }

  return milestones;
}
