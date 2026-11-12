/** Independently implemented annual feed mechanics; callbacks are never serialized. */
export interface FeedState {
  recent: string[];
  lastYears: Record<string, number>;
  plan: null | {year: number; age: number; queue: {id: string; at: number}[]; gates: Record<string, boolean>};
}
export interface FeedCandidate {
  id: string;
  minAge: number;
  maxAge: number;
  weight: number | (() => number);
  repeatable?: boolean;
  gap?: number;
  eligible: (annualChance: (probability: number) => boolean) => boolean;
  run: () => void;
}
export const newFeedState = (): FeedState => ({recent: [], lastYears: {}, plan: null});
function eligible(state: FeedState, candidate: FeedCandidate, year: number, age: number, random: () => number): boolean {
  if(age<candidate.minAge || age>candidate.maxAge) return false;
  const last=state.lastYears[candidate.id];
  if(candidate.gap && last!==undefined && year-last<candidate.gap)return false;
  return candidate.eligible(probability=>{
    const gates=state.plan!.gates;
    if(!Object.hasOwn(gates,candidate.id))gates[candidate.id]=random()<probability;
    return gates[candidate.id];
  });
}
export function planAnnualFeed(state: FeedState, year: number, age: number, candidates: readonly FeedCandidate[], random: () => number): void {
  if(state.plan?.year===year)return;
  const count=age<6?2:3;
  const times=Array.from({length:count},(_,index)=>.08+(index+random()*.8)/count*.86);
  state.plan={year,age,queue:[],gates:{}};
  const selected=new Set<string>();
  for(const at of times){
    const pool:{candidate:FeedCandidate;weight:number}[]=[];
    for(const candidate of candidates){
      if(selected.has(candidate.id)||!eligible(state,candidate,year,age,random))continue;
      let weight=typeof candidate.weight==='function'?candidate.weight():candidate.weight;
      if(state.recent.includes(candidate.id))weight*=candidate.repeatable?.5:.08;
      if(Number.isFinite(weight)&&weight>0)pool.push({candidate,weight});
    }
    if(!pool.length)continue;
    let threshold=random()*pool.reduce((sum,item)=>sum+item.weight,0);
    let chosen=pool.at(-1)!.candidate;
    for(const item of pool){threshold-=item.weight;if(threshold<0){chosen=item.candidate;break}}
    selected.add(chosen.id);state.plan.queue.push({id:chosen.id,at});
  }
}
/** Dispatch one slot; an invalidated slot is consumed without effects or history. */
export function fireNextFeed(state: FeedState, year: number, age: number, candidates: readonly FeedCandidate[], random: () => number): string | null {
  if(!state.plan || state.plan.year!==year || state.plan.age!==age)return null;
  const next=state.plan.queue.shift();
  if(!next)return null;
  const candidate=candidates.find(item=>item.id===next.id);
  if(!candidate||!eligible(state,candidate,year,age,random))return null;
  candidate.run();
  state.lastYears[candidate.id]=year;
  state.recent.push(candidate.id);
  if(state.recent.length>14)state.recent.splice(0,state.recent.length-14);
  return candidate.id;
}
