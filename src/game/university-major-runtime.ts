import type {Decision,Life} from './types';
import {buildMajorOffer,majorAdmissionProbability,majorCompetition,resolveMajor,type MajorFacts,type MajorOffer,type MajorResult,type UniversityMajor} from './university-major';
import {educationEraInputs} from './education-era';
import {addKnowledge} from './learning-state';
export interface UniversityMajorRecord {age:number;country:string;stage:'university'|'graduate';offer:MajorOffer;status:'pending'|'resolved';choice?:UniversityMajor;result?:MajorResult}
export const isMajorDecision=(id:unknown)=>typeof id==='string'&&/^universityMajor-\d{1,3}$/.test(id);
/** Source eraNet: historical diffusion and future saturation, without changing other statistics. */
export function universityInternet(country:Life['country'],era:Life['era'],year:number):number{
 const y=era==='today'?year:Math.max(1950,Math.min(2100,Math.round(year)));
 if(y>=2026)return Math.round(country.id==='PRK'?country.net:country.net+(97-country.net)*(1-Math.exp(-(y-2026)/8)));
 if(y<1991)return 0;
 const midpoint=country.ppp>40000?2001:country.ppp>15000?2009:2016;
 const rate=(at:number)=>1/(1+Math.exp(-.32*(at-midpoint)));
 return Math.round(country.net*rate(y)/rate(2026));
}
export function universityMajorFacts(life:Life):MajorFacts|null{
 if(!life.learning||!life.academics)return null;
 const hobbies=life.hobbies.flatMap(h=>h.progress?[{id:h.id==='craft'?'crafts':h.id,since:h.progress.since,level:h.progress.level}]:[]);
 return {knowledge:life.stats.knowledge,quintile:life.stats.incomeQuintile,ppp:educationEraInputs(life.country,life.era,life.year).statistics.ppp,internet:universityInternet(life.country,life.era,life.year),night:false,graduate:life.academics.enrollment?.stage==='graduate',sportBackground:hobbies.some(h=>(h.id==='sport'||h.id.startsWith('sp_'))&&h.since<=12&&h.level>=5),rich:!!life.academics.primaryFacts?.rich,hobbies,talents:life.learning.talents,shownTalents:[]};
}
function eligible(life:Life){const a=life.academics;return life.alive&&a?.origin==='birth'&&!!life.learning&&!!a.enrollment&&['university','graduate'].includes(a.enrollment.stage)&&!a.enrollment.paused&&!a.enrollment.graduationPending&&!a.academy&&!a.major&&life.justice.prisonUntil===null;}
export function prepareUniversityMajor(life:Life,draw:()=>number,atEntry=false):boolean{
 if(!eligible(life)||atEntry&&['USA','CAN'].includes(life.country.id))return false;
 const a=life.academics!,record=a.majorRecord;if(record?.status==='resolved'||record?.age===life.age)return false;
 const facts=universityMajorFacts(life);if(!facts)return false;
 a.majorRecord={age:life.age,country:life.country.id,stage:a.enrollment!.stage as 'university'|'graduate',offer:buildMajorOffer(facts,draw),status:'pending'};return true;
}
export function universityMajorDecision(life:Life):Decision|null{
 const r=life.academics?.majorRecord,id=`universityMajor-${life.age}`;
 if(!eligible(life)||!r||r.age!==life.age||r.country!==life.country.id||r.stage!==life.academics!.enrollment!.stage||r.status!=='pending'||life.decisions.includes(id))return null;
 return {id,type:'choice',age:life.age,key:'decision.universityMajor',params:{country:r.country},choices:r.offer.options.map(major=>({id:`major_${major}`,key:['USA','CAN'].includes(r.country)&&['med','law'].includes(major)?`choice.major_${major}_pre`:`choice.major_${major}`,params:{}}))};
}
export function resolveUniversityMajor(life:Life,choice:string,draw:()=>number):MajorResult|null{
 const expected=universityMajorDecision(life),facts=universityMajorFacts(life);
 if(!expected||!facts||JSON.stringify(expected)!==JSON.stringify(life.pendingDecision)||!expected.choices.some(c=>c.id===choice))return null;
 const a=life.academics!,record=a.majorRecord!,result=resolveMajor(facts,record.offer,choice.slice(6) as UniversityMajor,draw);if(!result)return null;
 record.status='resolved';record.choice=choice.slice(6) as UniversityMajor;record.result=result;a.major=result.major;a.medicine=result.major==='med';addKnowledge(life,result.knowledge);life.stats.happiness+=result.happiness;
 if(result.hobbyGain){const hobby=life.hobbies.find(h=>h.id===result.hobbyGain!.id);if(hobby?.progress){hobby.progress.level=Math.min(1000,hobby.progress.level+1);hobby.skill=Math.min(100,hobby.progress.level*10);}}
 return result;
}
/** Reuse the consumed admission slot; rendering and decoding do not generate offers. */
export function scheduleUniversityMajor(life:Life,draw:()=>number):void{
 prepareUniversityMajor(life,draw,true);const d=universityMajorDecision(life);if(!d)return;
 const t=life.timeline;if(!t||t.complete){life.pendingDecision=d;return;}
 if(t.queue.some(s=>s.id===d.id))return;
 const scheduled=t.scheduledDecisions??=[];if(scheduled.length>=2){life.pendingDecision=d;return;}
 t.queue.push({kind:'decision',id:d.id,at:Math.max(t.position,Math.min(.97,t.position+.04))});t.queue.sort((a,b)=>a.at-b.at);scheduled.push(d);scheduled.sort((a,b)=>t.queue.findIndex(s=>s.id===a.id)-t.queue.findIndex(s=>s.id===b.id));
}
export function majorChoiceChance(life:Life,choice:string):number|null{
 const major=choice.slice(6) as UniversityMajor,facts=universityMajorFacts(life);
 if(!choice.startsWith('major_')||!facts||!universityMajorDecision(life)?.choices.some(c=>c.id===choice)||!majorCompetition(facts,major)&&!['mus','dnc'].includes(major))return null;
 return majorAdmissionProbability(facts,major);
}
