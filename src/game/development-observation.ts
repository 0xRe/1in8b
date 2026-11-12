import type {Life} from './types';
import {educationEraInputs} from './education-era';
export interface DevelopmentObservations {
 version:1;lastCheckedAge:number;
 adultAdhd?:number; stories?:Partial<Record<"attentionStrength"|"readingStrength"|"attentionEases"|"reminders"|"listening",number>>;
 developmental?:{age:number;diagnosed:boolean};adhd?:{age:number;diagnosed:boolean};dyslexia?:{age:number;diagnosed:boolean};
}
interface Access {country:string;region:string;ppp:number;urban:boolean;year:number}
const richRegion=(c:Access)=>c.ppp>=15000&&['hi','eca'].includes(c.region);
const accessible=(c:Access)=>c.ppp>=10000||c.urban&&c.ppp>=4000;
/** Historical source-game diagnosis calibration; not medical advice or real-world prevalence. */
export function namedLearningProbability(c:Access,kind:'adhd'|'dyslexia'):number {
 if(!accessible(c))return 0;
 if(c.country==='USA')return kind==='adhd'?(c.year>=1987?.9:0):(c.year>=1977?.68:0);
 if(kind==='adhd'&&c.country==='SWE')return c.year>=2005?.85:c.year>=2000?.3:0;
 if(kind==='adhd'&&c.country==='KOR')return c.year>=2020?.4:c.year>=2005?.15:0;
 if(richRegion(c))return c.year>=2000?.3:0;
 return c.year>=2010?(kind==='adhd'?.08:.05):0;
}
/** Player observation and follow-up branches, with original annual priority and one-time receipts. */
export function observeDevelopment(life:Life,draw:()=>number):string|null {
 const birth=life.birthDevelopment;if(!life.alive||!birth||!birth.developmental&&!birth.attentionLearning)return null;
 const state=life.developmentObservations??={version:1,lastCheckedAge:-1};
 if(life.age<=state.lastCheckedAge)return null;state.lastCheckedAge=life.age;
 const c={country:life.country.id,region:life.country.region,ppp:educationEraInputs(life.country,life.era,life.year).statistics.ppp,urban:life.residence==='urban',year:life.year};
 const d=birth.developmental;
 if(d&&!state.developmental&&life.age>=d.noticedAt){
  const diagnosed=accessible(c)&&!(d.kind==='autism'&&life.year<(c.region==='hi'?1980:2000));
  state.developmental={age:life.age,diagnosed};
  if(!diagnosed&&d.kind==='autism'&&!d.intellectualDisability&&!d.learningDifficulty&&life.age>=18)return null;
  return diagnosed?(d.kind==='autism'?'autismDiagnosed':'intellectualDiagnosed'):'developmentUnrecognized';
 }
 const n=birth.attentionLearning;
 if(n?.adhd&&!state.adhd&&life.age>=n.noticedAt!){
  const diagnosed=draw()<namedLearningProbability(c,'adhd');state.adhd={age:life.age,diagnosed};life.stats.happiness+=diagnosed?1:-2;
  return diagnosed?'adhdDiagnosed':'adhdUnrecognized';
 }
 if(n?.dyslexia&&!state.dyslexia&&life.schooling.enrolled&&life.age>=7){
  const diagnosed=draw()<namedLearningProbability(c,'dyslexia');state.dyslexia={age:life.age,diagnosed};life.stats.happiness+=diagnosed?1:-2;
  return diagnosed?'dyslexiaDiagnosed':'dyslexiaUnrecognized';
 }
 if(!n)return null;
 const once=(key:keyof NonNullable<DevelopmentObservations['stories']>,p:number)=>{
  if(state.stories?.[key]!==undefined||draw()>=p)return false;
  (state.stories??={})[key]=life.age;return true;
 };
 if(n.adhd&&state.adhd&&life.age>=8&&life.age<=30&&once('attentionStrength',.12)){
  life.stats.happiness+=2;const detail=draw();if(life.hobbies[0]&&detail<.5){life.hobbies[0].skill+=1;if(life.hobbies[0].progress)life.hobbies[0].progress.level+=1;}
  return 'attentionStrength';
 }
 if(n.dyslexia&&state.dyslexia&&life.age>=9&&life.age<=30&&once('readingStrength',.1)){life.stats.happiness+=2;return 'readingStrength';}
 if(life.age<18)return null;
 if(n.adhd&&!n.persistentAdhd&&life.age<=24&&once('attentionEases',.2))return 'attentionEases';
 if(n.adhd&&n.persistentAdhd&&!state.adhd?.diagnosed&&state.adultAdhd===undefined&&life.age<=55&&life.year>=2010&&(richRegion(c)||c.country==='USA')&&draw()<(life.sex==='F'?.018:.012)){
  state.adultAdhd=life.age;life.stats.happiness+=1;return 'adultAdhdDiagnosed';
 }
 if(n.adhd&&n.persistentAdhd&&life.age>=22&&life.age<=50&&once('reminders',.08))return 'reminders';
 if(n.dyslexia&&state.dyslexia&&life.age>=25&&life.age<=55&&once('listening',.03)){life.stats.happiness+=1;return life.year>=2005?'audiobooks':'readingAloud';}
 return null;
}
export function validateDevelopmentObservations(life:Life):void {
 const state=life.developmentObservations;if(state===undefined)return;
 const fail=()=>{throw Error('Invalid or unsupported life save.');};
 const object=(v:any)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail();};
 const age=(v:any,min:number,max:number)=>{if(!Number.isInteger(v)||v<min||v>max)fail();};
 object(state);if(state.version!==1||!life.birthDevelopment||!life.birthDevelopment.developmental&&!life.birthDevelopment.attentionLearning)fail();age(state.lastCheckedAge,0,life.age);
 for(const key of ['developmental','adhd','dyslexia'] as const){
  const record=state[key];if(record===undefined)continue;object(record);if(typeof record.diagnosed!=='boolean')fail();
  const birth=life.birthDevelopment!;
  const min=key==='developmental'?birth.developmental?.noticedAt:key==='adhd'?birth.attentionLearning?.adhd?birth.attentionLearning.noticedAt:null:birth.attentionLearning?.dyslexia?7:null;
  if(min==null)fail();age(record.age,min!,state.lastCheckedAge);
 }
 const n=life.birthDevelopment!.attentionLearning;
 if(state.adultAdhd!==undefined){
  if(!n?.adhd||!n.persistentAdhd||!state.adhd||state.adhd.diagnosed)fail();
  age(state.adultAdhd,Math.max(18,state.adhd!.age+1),Math.min(55,state.lastCheckedAge));
  if(life.birthYear+state.adultAdhd<2010)fail();
 }
 if(state.stories!==undefined){
  object(state.stories);
  const bounds={attentionStrength:[8,30],readingStrength:[9,30],attentionEases:[18,24],reminders:[22,50],listening:[25,55]} as const;
  for(const [key,value] of Object.entries(state.stories)){
   if(!(key in bounds))fail();const [min,max]=bounds[key as keyof typeof bounds];age(value,min,Math.min(max,state.lastCheckedAge));
   if(['readingStrength','listening'].includes(key)){if(!n?.dyslexia||!state.dyslexia||value<=state.dyslexia.age)fail();}
   else if(!n?.adhd)fail();
   if(key==='attentionStrength'&&(!state.adhd||value<=state.adhd.age))fail();
   if(key==='attentionEases'&&n?.persistentAdhd)fail();
   if(key==='reminders'&&!n?.persistentAdhd)fail();
  }
 }
 const dates=[...Object.values(state.stories??{}),state.adultAdhd,state.developmental?.age,state.adhd?.age,state.dyslexia?.age].filter((v):v is number=>v!==undefined);
 if(new Set(dates).size!==dates.length)fail();
}
