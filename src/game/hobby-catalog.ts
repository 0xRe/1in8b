import {activePhysicalCondition,physicalFeetOff} from './physical-activity';
import type {Hobby,HobbyId,Life} from './types';
import {NAMED_SPORT_IDS,isNamedSport,discoverySports,sportDiscoveryWeight} from './named-sports';
import type {Talents} from './learning-state';
import {incomeAtPercentile,percentileOfIncome} from './income-distribution';
import {educationEraInputs} from './education-era';
export interface HobbyDefinition {happiness:number;health:number;social:number;knowledge:number;cost:number;talent?:keyof Talents;minAge?:number}
const d=(happiness:number,health:number,social:number,knowledge:number,cost:number,talent?:keyof Talents,minAge?:number):HobbyDefinition=>({happiness,health,social,knowledge,cost,talent,minAge});
/** General effects; named sports share the sport definition. */
const definitions={
 sport:d(3,4,2,0,.01,'body'),music:d(4,0,2,1,.01,'music'),dance:d(4,2,2,0,.005,'music'),
 screen:d(3,-1,0,0,.005),sns:d(2,-1,2,0,.01,'words',13),games:d(4,-1,1,1,.02,'study'),
 reading:d(2,0,0,4,.01,'study'),faith:d(3,0,4,0,.02,'words'),fishing:d(3,1,1,0,.01,'hands'),
 cooking:d(3,1,2,1,.01,'hands',10),garden:d(3,2,0,0,.005,'hands'),hiking:d(3,3,1,0,.005,'body'),
 travel:d(5,0,1,2,.06,undefined,16),board:d(3,0,3,1,.002,'study'),craft:d(3,0,1,1,.01,'hands'),
 art:d(3,0,1,2,.01,'art'),writing:d(3,0,0,3,.003,'words'),drama:d(4,0,3,1,.01,'words'),
 photo:d(3,1,1,1,.03,'art',12),gym:d(2,5,0,0,.03,'body',14),karaoke:d(4,0,3,0,.02,'music',12),
} satisfies Partial<Record<HobbyId,HobbyDefinition>>;
const GENERAL_HOBBY_IDS=Object.keys(definitions) as (keyof typeof definitions)[];
export const SOURCE_HOBBY_IDS:HobbyId[]=[...GENERAL_HOBBY_IDS,...NAMED_SPORT_IDS];
export const ALL_HOBBY_IDS:readonly HobbyId[]=[...SOURCE_HOBBY_IDS,'nature'];
export function hobbyDefinition(id:string):HobbyDefinition|null{return isNamedSport(id)?definitions.sport:Object.hasOwn(definitions,id)?definitions[id as keyof typeof definitions]:null;}
export function sourceHobbyLevel(hobby:Hobby):number|null{return hobby.progress?.level??null;}
export function hobbyTalent(life:Life,id:string):number|null{const domain=hobbyDefinition(id)?.talent;return domain&&life.learning?life.learning.talents[domain]:null;}
export function hobbyTalentMultiplier(life:Life,id:string):number{const talent=hobbyTalent(life,id);return talent===null?1:Math.max(.4,Math.min(1.9,1+.35*talent));}
export function hobbyMedianIncome(life:Life):number{return incomeAtPercentile({...life.country,...educationEraInputs(life.country,life.era,life.year).statistics},.5);}
const karaokeYear:Record<string,number>={JPN:1977,PHL:1980,TWN:1988,CHN:1990,KOR:1991,THA:1990,VNM:1995,PRK:2000};
export function hobbyOptionsFor(life:Life):HobbyId[]{
 const body=activePhysicalCondition(life);
 const current=new Set(life.hobbies.map(h=>h.id));
 const school=life.academics?.enrollment;
 const literate=life.academics?(life.academics.qualification>=1||!!school&&school.completedYears>=1):life.stats.education>=1||life.schooling.enrolled&&life.schooling.years>=1;
 const country={...life.country,...educationEraInputs(life.country,life.era,life.year).statistics};
 const percentile=percentileOfIncome(country,life.stats.annualIncome);
 const canAfford=(floor:number)=>life.age<18?life.stats.incomeQuintile>=4:percentile>=floor;
 const screen=life.belongings.phone||life.belongings.housing==='family'&&life.year>=1992&&incomeAtPercentile(country,Math.max(.05,Math.min(.95,(life.stats.incomeQuintile-.5)/5)))>=2500;
 return [...GENERAL_HOBBY_IDS,...discoverySports(life)].filter(id=>{
  const def=hobbyDefinition(id)!;
  if(body?.kind==='hearing'&&(id==='music'||id==='karaoke')||body?.kind==='mobility'&&id==='dance'||id==='hiking'&&physicalFeetOff(life))return false;
  if(current.has(id)||life.age<(def.minAge??0))return false;
  if((id==='reading'||id==='writing')&&!literate)return false;
  if(id==='sns'&&!life.belongings.phone||id==='screen'&&!screen)return false;
  if(id==='games'&&(life.country.net<60||!canAfford(.35)))return false;
  if(id==='travel'&&!canAfford(.5)||id==='photo'&&!canAfford(.45)||id==='gym'&&(!canAfford(.4)||life.residence!=='urban'))return false;
  if(id==='karaoke'&&(!(life.country.id in karaokeYear)||life.year<karaokeYear[life.country.id]))return false;
  if(id==='faith'&&(life.country.id==='PRK'||life.country.id==='CHN'&&life.era!=='today'&&life.year>=1966&&life.year<=1978||life.stats.religion==='none'&&life.age<15))return false;
  if(id==='sport'&&life.age>=70&&life.stats.health<40)return false;
  return true;
 });
}
export function drawHobbyChoices(life:Life,random:()=>number):HobbyId[]{
 const options=hobbyOptionsFor(life);
 const available=[...options.filter(isNamedSport),...options.filter(id=>id!=='sport'&&!isNamedSport(id))].map(id=>{
  let weight=isNamedSport(id)?sportDiscoveryWeight(life,id):id==='faith'?(life.stats.religion==='none'?.15:1.5):id==='screen'?(life.country.ppp>3000?1.5:.4):id==='garden'&&life.residence==='urban'?.4:id==='karaoke'?2:id==='writing'?.6:1;
  if(life.age>55&&(id==='games'||id==='dance'))weight*=.3;
  const talent=hobbyTalent(life,id);if(talent!==null)weight*=Math.exp(.5*talent-.125);
  return {id,weight};
 });
 const selected:HobbyId[]=[];
 while(available.length&&selected.length<3){
  const total=available.reduce((n,o)=>n+o.weight,0);let draw=Math.max(0,Math.min(1-Number.EPSILON,random()))*total,index=0;
  for(;index<available.length-1;index++){draw-=available[index].weight;if(draw<0)break;}
  selected.push(available.splice(index,1)[0].id);
 }
 return selected;
}
/** Unknown old source levels cannot be ranked using their unrelated legacy meter. */
export function replacedHobby(hobbies:readonly Hobby[]):Hobby|null{
 if(hobbies.length<3||hobbies.some(h=>!h.progress))return null;
 let candidate=hobbies[0];
 for(const h of hobbies.slice(1))if(h.progress!.level<candidate.progress!.level||h.progress!.level===candidate.progress!.level&&h.progress!.since<=candidate.progress!.since)candidate=h;
 return candidate;
}
