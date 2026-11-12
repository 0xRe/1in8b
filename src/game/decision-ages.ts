/** Shared ages for the existing fixed decisions; relationship also has a later offer. */
export const FIXED_DECISION_AGES: Readonly<Record<string, number>> = {
  temperament: 2, hobby: 7, school: 8, relocation: 16,
  education: 18, opportunity: 25, relationship: 21, balance: 40,
};
export function fixedDecisionAt(id: string, age: number): boolean {
  return Object.hasOwn(FIXED_DECISION_AGES, id) &&
    (FIXED_DECISION_AGES[id] === age || id === 'relationship' && age === 28);
}
