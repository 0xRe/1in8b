/** Serializable intra-year ordering. Game effects remain in the caller. */
export interface YearSlot {
  kind: 'feed' | 'decision' | 'milestone' | 'adoption';
  id: string;
  at: number;
}
export interface YearTimeline {
  position: number;
  complete: boolean;
  queue: YearSlot[];
}
export interface ScheduledDecision { id: string; at?: number }

/** Feed selection happens first; only the first two planned decisions enter this year. */
export function planYearTimeline(
  feed: readonly {id: string; at: number}[],
  decisions: readonly ScheduledDecision[],
  random: () => number,
  early: {adoptionMove?: boolean; survivalMilestone?: boolean} = {},
): YearTimeline {
  const queue: YearSlot[] = feed.map(slot => ({...slot, kind: 'feed'}));
  decisions.slice(0, 2).forEach((decision, index) => {
    queue.push({kind: 'decision', id: decision.id, at: decision.at ?? .3 + index * .3 + random() * .15});
  });
  if (early.survivalMilestone) queue.push({kind: 'milestone', id: 'survive', at: .03});
  if (early.adoptionMove) queue.push({kind: 'adoption', id: 'move', at: .02});
  // Stable sort preserves feed-before-decision ordering at equal timestamps.
  queue.sort((a, b) => a.at - b.at);
  return {position: 0, complete: false, queue};
}

/**
 * Advance by a fraction of one year. Returning true from dispatch suspends at
 * that slot (for a decision or an ending). Unused tick time is not carried over.
 * The caller must not invoke this while a decision is unresolved or paused.
 */
export function advanceYearTimeline(
  state: YearTimeline,
  elapsed: number,
  dispatch: (slot: YearSlot) => boolean,
): void {
  if (!Number.isFinite(elapsed) || elapsed < 0) throw new RangeError('Invalid year elapsed time');
  if (state.complete) return;
  const target = Math.min(1, state.position + elapsed);
  while (state.queue.length && state.queue[0].at <= target) {
    const slot = state.queue.shift()!;
    state.position = slot.at;
    if (dispatch(slot)) return;
  }
  state.position = target;
  state.complete = target === 1;
}
