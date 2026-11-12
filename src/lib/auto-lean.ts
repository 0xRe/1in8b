import type { Decision } from '../game/types';

export type AutoLean = 'balanced' | 'cautious' | 'adventurous' | 'family';

export const AUTO_LEAN_OPTIONS: readonly AutoLean[] = [
  'balanced',
  'cautious',
  'adventurous',
  'family',
] as const;

/**
 * Keywords and score adjustments for decision choice evaluation.
 */
const LEAN_WEIGHTS = {
  cautious: {
    boost: [
      'stay', 'keep', 'calm', 'talk', 'save', 'rest', 'wait', 'consult',
      'safe', 'protect', 'treat', 'hospital', 'clinic', 'decline', 'retire',
      'no', 'home', 'care', 'peace', 'studyfinish', 'finish',
    ],
    penalty: [
      'hit', 'gamble', 'debt', 'risk', 'investall', 'rush', 'fight', 'steal',
    ],
  },
  adventurous: {
    boost: [
      'go', 'venture', 'dream', 'business', 'startbusiness', 'pursuedream',
      'promote', 'migrate', 'abroad', 'invest', 'trip', 'explore', 'yes',
      'study', 'accept', 'move', 'holiday', 'volunteer', 'new', 'travel',
    ],
    penalty: [
      'stay', 'wait', 'decline', 'no', 'hit',
    ],
  },
  family: {
    boost: [
      'together', 'family', 'partner', 'child', 'kid', 'baby', 'home',
      'care', 'visit', 'help', 'reunion', 'marry', 'date', 'love', 'talk',
      'calm', 'neighbor', 'mentor', 'migratetogether',
    ],
    penalty: [
      'leave', 'hit', 'alone', 'divorce', 'distance', 'fight',
    ],
  },
  balanced: {
    boost: [
      'talk', 'calm', 'help', 'treat', 'study', 'save', 'care', 'safe',
    ],
    penalty: [
      'hit', 'gamble', 'debt', 'ruin',
    ],
  },
};

/**
 * Scores a candidate choice according to the designated life philosophy.
 */
function scoreChoice(choiceId: string, choiceKey: string, lean: AutoLean): number {
  const normalized = (choiceId + ' ' + choiceKey).toLowerCase();
  let score = 0;

  // Universally penalize destructive choices like hitting a child across all philosophies
  if (normalized.includes('hit') || normalized.includes('violence')) {
    score -= 100;
  }

  const weights = LEAN_WEIGHTS[lean];
  for (const word of weights.boost) {
    if (normalized.includes(word)) score += 10;
  }
  for (const word of weights.penalty) {
    if (normalized.includes(word)) score -= 15;
  }

  return score;
}

/**
 * Selects the optimal choice from a pending decision according to auto lean.
 */
export function selectAutoChoice(decision: Decision, lean: AutoLean = 'balanced'): string {
  const choices = decision.choices;
  if (!choices || choices.length === 0) return 'skip';
  if (choices.length === 1) return choices[0].id;

  let bestChoice = choices[0].id;
  let bestScore = -Infinity;

  for (let i = 0; i < choices.length; i++) {
    const c = choices[i];
    // Base slight preference for earlier choice order as tie-breaker
    const tieBreaker = (choices.length - i) * 0.1;
    const score = scoreChoice(c.id, c.key, lean) + tieBreaker;
    if (score > bestScore) {
      bestScore = score;
      bestChoice = c.id;
    }
  }

  return bestChoice;
}
