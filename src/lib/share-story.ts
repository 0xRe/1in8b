import type {GameEvent,Life} from '../game/types';
import {countryName} from '../game/countries';
import type {Locale,translator} from './i18n';
import {viralCopy} from './viral-copy';

const isStoryEvent=(life:Life,e:GameEvent)=>['family','career','milestone'].includes(e.kind)&&e.age<=life.age&&e.age>=0&&e.year===life.birthYear+e.age&&!/death|funeral|goodbye|reflection|health|illness|hospital|careCost/i.test(e.key)&&!['event.choice','event.decision'].includes(e.key);

/** The few peaks of a life worth a share button in its record: about six per life, not every promotion. */
const PEAK_MOMENTS=new Set(['event.firstSteps','event.graduate','event.newJob','event.marriage','event.child','event.retirement','event.descendantWedding','event.descendantBirth','event.greatGrandchildrenFirst']);
export const isPeakMoment=(life:Life,e:GameEvent)=>PEAK_MOMENTS.has(e.key)&&isStoryEvent(life,e);

/** Suggestions come from recorded experiences, never journal entries or private reflections.
 * Keep a spread of family, work and milestones rather than letting annual work events crowd out family.
 * A moment chosen from the record (`include`) is always offered, even when newer ones would crowd it out. */
export function storyMoments(life:Life,include=''):GameEvent[]{
 const eligible=life.events.filter(e=>isStoryEvent(life,e));
 const seen=new Set<string>(),result:GameEvent[]=[];
 for(const kind of ['family','career','milestone']){
  let count=0;
  for(const e of [...eligible].reverse()){
   const signature=JSON.stringify([e.key,e.params]);
   if(e.kind!==kind||seen.has(signature))continue;
   seen.add(signature);result.push(e);if(++count===2)break;
  }
 }
 const chosen=include?eligible.find(e=>e.id===include):undefined;
 if(chosen&&!result.includes(chosen))result.push(chosen);
 return result.sort((a,b)=>a.age-b.age);
}

/** The selected event is quoted as a game record, without inventing feelings or a relationship duration. */
export function momentPost(life:Life,event:GameEvent,locale:Locale,t:ReturnType<typeof translator>,comment=''){
 const country=countryName(life.migration?.birthCountry??life.country,locale);
 return [comment.trim().slice(0,160),`${life.name} · ${country}`,`${t('age')} ${event.age} · ${event.year}`,t(event.key,event.params),viralCopy(locale).postChallenge].filter(Boolean).join('\n');
}
