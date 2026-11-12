import type { DuoCommand, DuoSnapshot } from './duo-engine';
export type DuoClientCommand = DuoCommand extends infer C ? C extends { id: string } ? Omit<C, 'id' | 'stage' | 'runIndex' | (C extends { kind: 'personal' } ? 'proposalVersion' : never)> : never : never;
/** Add version guards only to command contracts that accept them. */
export function duoCommandPayload(action:DuoClientCommand,snapshot:Pick<DuoSnapshot,'stage'|'runIndex'|'proposalVersion'>,id:string):DuoCommand {
 const versioned=action.kind.startsWith('life-')||action.kind.startsWith('shared-')||['personal','continue','replay'].includes(action.kind);
 return {id,...action,...(versioned?{runIndex:snapshot.runIndex}:{}),...(['personal','continue'].includes(action.kind)?{stage:snapshot.stage}:{}),...(action.kind==='personal'?{proposalVersion:snapshot.proposalVersion}:{})} as DuoCommand;
}
