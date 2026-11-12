import type { Life } from './types';
import {hobbyCategory,hobbyPracticeBlocked} from './named-sports';
import {hobbyDefinition,hobbyTalent} from './hobby-catalog';
import {settleFocusPractice} from './focus-practice';
import type {FocusWeights} from './focus-effects';
/** Only known new-birth contexts track source-scale interests; legacy skill is not a level. */
export function refreshEducationContext(life:Life):void {
 if(life.academics?.origin!=='birth'||!life.academics.upperFacts)return;
 life.academics.upperFacts.hobbies=life.hobbies.flatMap(h=>h.progress?[{id:h.id==='craft'?'crafts':h.id,since:h.progress.since,level:h.progress.level}]:[]);
}
/** One completed observed year. No calendar-gap backfill and no life RNG consumption. */
export function settleEducationHobbies(life:Life,time:FocusWeights={}):void {
 if(life.academics?.origin!=='birth'||!life.timeline?.complete)return;
 const entries=life.hobbies.filter(h=>h.progress&&(h.progress.lastSettledAge??-1)<life.age);
 const inputs=entries.map(h=>({id:h.id,level:h.progress!.level,sport:hobbyCategory(h.id)==='sport',blocked:life.justice.prisonUntil!==null||hobbyPracticeBlocked(life,h.id),talent:hobbyTalent(life,h.id)}));
 const practiced=settleFocusPractice(inputs,time);
 const spending=life.hobbyState?.pausedSince!==undefined?.5:1;
 for(let i=0;i<entries.length;i++){
  const h=entries[i],input=inputs[i],p=h.progress!;
  p.level=Math.min(1000,practiced[i].level+(input.blocked?0:.35*(input.talent===null?1:Math.max(.4,Math.min(1.9,1+.35*input.talent)))*spending));
  p.lastSettledAge=life.age;
  const def=hobbyDefinition(h.id);
  if(def&&life.justice.prisonUntil===null){life.stats.happiness=Math.max(0,Math.min(100,life.stats.happiness+def.happiness*.35*spending));life.stats.health=Math.max(0,Math.min(100,life.stats.health+def.health*.3*spending));life.stats.social=Math.max(0,Math.min(100,life.stats.social+def.social*.3*spending));}
 }
 refreshEducationContext(life);
}
