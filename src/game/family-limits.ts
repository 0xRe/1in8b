/** Shared lineage capacities; kept independent of progression engines to avoid cycles. */
export const FAMILY_LIMITS = { parents: 2, siblings: 8, children: 8 } as const;
export const MAX_CHILD_GRANDCHILDREN = 9;
export const MAX_GRANDCHILDREN = FAMILY_LIMITS.children * MAX_CHILD_GRANDCHILDREN;
export const MAX_GREAT_GRANDCHILDREN = MAX_GRANDCHILDREN * 9;
export const MAX_GREAT_GREAT_GRANDCHILDREN = MAX_GREAT_GRANDCHILDREN * 9;
/** Children and grandchildren may have spouses; the player may have two partners. */
export const MAX_RELATIVES = FAMILY_LIMITS.parents + FAMILY_LIMITS.siblings +
  FAMILY_LIMITS.children * 2 + MAX_GRANDCHILDREN * 2 + 2 +
  MAX_GREAT_GRANDCHILDREN + MAX_GREAT_GREAT_GRANDCHILDREN;
