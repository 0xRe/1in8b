/** University major rules; runtime integration must provide observed facts and persist offers. */
export const MAJOR_IDS=['med','nurse','law','eng','cs','biz','edu','sci','hum','art','agr','pe','soc','media','arch','hosp','mil','mus','dnc'] as const;
export type UniversityMajor=typeof MAJOR_IDS[number];
export interface MajorFacts {knowledge:number;quintile:number;ppp:number;internet:number;night:boolean;graduate:boolean;sportBackground:boolean;rich:boolean;hobbies:{id:string;since:number;level:number}[];talents:{body:number;art:number;music:number;hands:number;words:number};shownTalents:(keyof MajorFacts['talents'])[];artsHobbyId?:string;artsSchool?:boolean;degreeDreamJob?:string}
export interface MajorOffer {options:UniversityMajor[];preferred:UniversityMajor[];medicineOffered:boolean;hobby?:{major:UniversityMajor;id:string};talent?:keyof MajorFacts['talents'];auditions:UniversityMajor[]}
const weights:Partial<Record<UniversityMajor,number>>={nurse:1.3,law:.65,eng:2,cs:.8,biz:3,edu:1.3,hum:1.1,art:.65,agr:.35,soc:1.3,media:.4,arch:.2,hosp:.5};
const jobs:Record<UniversityMajor,readonly string[]>={med:['doctor','nurse','prof'],nurse:['nurse','care','healthtech'],law:['lawyer','civil','police'],eng:['engineer','electric','dev','mechanic'],cs:['dev','engineer'],biz:['finance','clerk','owner','shop','salesagent'],edu:['teacher','civil','childcare','social'],sci:['prof','teacher','engineer','dev','healthtech'],hum:['teacher','clerk','creator','prof','civil','social'],art:['creator','designer','teacher','artisan'],agr:['agbiz','prof','civil'],pe:['teacher','coach','trainer'],soc:['social','civil','clerk','prof','salesagent'],media:['creator','clerk','designer','salesagent'],arch:['engineer','designer','construct'],hosp:['cook','clerk','salesagent','shop'],mil:['soldier','police','civil'],mus:['musician','teacher','creator'],dnc:['dancer','teacher','trainer']};
const hobbyMajors:Record<string,UniversityMajor>={art:'art',crafts:'art',photo:'art',music:'mus',dance:'dnc',karaoke:'art',drama:'art',reading:'hum',faith:'hum',games:'cs',garden:'agr',gym:'pe',sport:'pe',cooking:'hosp',travel:'hosp',sns:'media'};
const talentMajors:Record<keyof MajorFacts['talents'],UniversityMajor>={body:'pe',art:'art',music:'art',hands:'eng',words:'media'};
const auditionRules={mus:{hobby:'music',talent:'music' as const,since:15,level:3},dnc:{hobby:'dance',talent:'body' as const,since:12,level:4.5}};
const clamp=(n:number,lo:number,hi:number)=>Math.max(lo,Math.min(hi,n));
const isAudition=(major:UniversityMajor):major is keyof typeof auditionRules=>major==='mus'||major==='dnc';
const roll=(draw:()=>number)=>clamp(draw(),0,1-Number.EPSILON);
function weighted(options:readonly UniversityMajor[],draw:()=>number):UniversityMajor{
 let position=roll(draw)*options.reduce((sum,id)=>sum+(weights[id]??1),0);
 for(const id of options){position-=weights[id]??1;if(position<0)return id;}
 return options[options.length-1];
}
function auditionHobby(c:MajorFacts,major:keyof typeof auditionRules){const rule=auditionRules[major];return c.hobbies.find(h=>h.id===rule.hobby&&h.since<=rule.since&&h.level>=rule.level);}
function artsSchool(c:MajorFacts,hobby:string){return c.artsHobbyId?c.artsHobbyId===hobby:!!c.artsSchool;}
export function majorCompetition(c:Pick<MajorFacts,'ppp'>,major:UniversityMajor):0|1|2{
 if(major==='law'||major==='cs'&&c.ppp>15000)return 2;
 return ['cs','eng','nurse','arch'].includes(major)?1:0;
}
export function majorAdmissionProbability(c:MajorFacts,major:UniversityMajor):number{
 if(isAudition(major)){
  const rule=auditionRules[major],h=auditionHobby(c,major);
  return h?clamp(.25+.07*(h.level-rule.level)+.1*c.talents[rule.talent]+.05*(c.quintile-3)+(artsSchool(c,h.id)?.15:0),.1,.85):.1;
 }
 const family=(c.quintile-3)*.04;
 return majorCompetition(c,major)===2?clamp(.45+(c.knowledge-60)*.02+family,.1,.97):clamp(.7+(c.knowledge-50)*.012+family,.3,.98);
}
export const shortageMajor=(major:UniversityMajor|undefined)=>!!major&&['med','nurse','eng','cs'].includes(major);
/** Build once, then persist options/preference order; displaying an offer must never reroll it. */
export function buildMajorOffer(c:MajorFacts,draw:()=>number):MajorOffer{
 const medicine=!c.night&&c.knowledge>=92&&roll(draw)<.45*Math.pow(clamp((c.knowledge-92)/8,0,1),2);
 const candidates=MAJOR_IDS.filter(id=>!['med','mil','mus','dnc'].includes(id)&&(id!=='law'||c.knowledge>=40)&&(id!=='cs'||c.internet>=40)&&(id!=='pe'||c.sportBackground||roll(draw)<.2));
 const pool=[...candidates],options:UniversityMajor[]=[];
 while(options.length<(medicine?4:5)&&pool.length){const picked=weighted(pool,draw);options.push(picked);pool.splice(pool.indexOf(picked),1);}
 if(c.sportBackground&&!options.includes('pe'))options[options.length-1]='pe';
 const auditions:UniversityMajor[]=c.night||c.graduate?[]:(['mus','dnc'] as const).filter(major=>{
  const h=auditionHobby(c,major);return !!h&&(c.quintile>=4||c.rich||c.talents[auditionRules[major].talent]>=1.3||artsSchool(c,h.id));
 });
 let hobby:MajorOffer['hobby'],bestLevel=-Infinity;
 for(const h of c.hobbies){
  let major=hobbyMajors[h.id]??(h.id.startsWith('sp_')?'pe':undefined);
  if(major&&isAudition(major)&&!auditions.includes(major))major='art';
  if(major&&[...candidates,...auditions].includes(major)&&h.since<=18&&h.level>=2&&h.level>bestLevel){hobby={major,id:h.id};bestLevel=h.level;}
 }
 const dream=c.degreeDreamJob?candidates.filter(id=>jobs[id].includes(c.degreeDreamJob!)).sort((a,b)=>jobs[a].indexOf(c.degreeDreamJob!)-jobs[b].indexOf(c.degreeDreamJob!))[0]:undefined;
 const talent=hobby?undefined:c.shownTalents.filter(domain=>c.talents[domain]>=1&&candidates.includes(talentMajors[domain])).sort((a,b)=>c.talents[b]-c.talents[a])[0];
 const protectedMajors=new Set<UniversityMajor>(c.sportBackground?['pe']:[]);
 const include=(id:UniversityMajor)=>{
  if(options.includes(id)){protectedMajors.add(id);return;}
  for(let i=options.length-1;i>=0;i--)if(!protectedMajors.has(options[i])){options[i]=id;protectedMajors.add(id);return;}
 };
 if(hobby)include(hobby.major);if(dream)include(dream);if(talent)include(talentMajors[talent]);for(const id of auditions)include(id);
 if(medicine)options.unshift('med');
 return {options,preferred:[hobby?.major,dream,talent?talentMajors[talent]:undefined].filter((id):id is UniversityMajor=>!!id),medicineOffered:medicine,...(hobby?{hobby}:{}),...(talent?{talent}:{}),auditions};
}
export interface MajorResult {major:UniversityMajor;outcome:'chosen'|'competitiveRejected'|'auditionRejected'|'auditionAccepted';knowledge:2;happiness:number;hobbyGain?:{id:string;amount:1}}
export function resolveMajor(c:MajorFacts,offer:MajorOffer,choice:UniversityMajor,draw:()=>number):MajorResult|null{
 if(!offer.options.includes(choice))return null;
 if(isAudition(choice)){
  if(roll(draw)>=majorAdmissionProbability(c,choice)){
   const alternatives:UniversityMajor[]=choice==='mus'?['art','art','edu','media']:['pe','pe','art','edu'];
   return {major:alternatives[Math.floor(roll(draw)*alternatives.length)],outcome:'auditionRejected',knowledge:2,happiness:-4};
  }
  const hobby=auditionHobby(c,choice);
  return {major:choice,outcome:'auditionAccepted',knowledge:2,happiness:4,...(hobby?{hobbyGain:{id:hobby.id,amount:1 as const}}:{})};
 }
 if(majorCompetition(c,choice)&&roll(draw)>=majorAdmissionProbability(c,choice)){
  const alternatives=offer.options.filter(id=>id!==choice&&!majorCompetition(c,id)&&!isAudition(id)&&id!=='med');
  const preferred=offer.preferred.find(id=>alternatives.includes(id));
  const fallback:UniversityMajor[]=['hum','soc','biz','edu','sci','agr','media','hosp'];
  const major=preferred??(alternatives.length?weighted(alternatives,draw):fallback[Math.floor(roll(draw)*fallback.length)]);
  return {major,outcome:'competitiveRejected',knowledge:2,happiness:-3};
 }
 return {major:choice,outcome:'chosen',knowledge:2,happiness:0};
}

export const majorMatchesOccupation=(major:UniversityMajor,job:string)=>jobs[major].includes(job);
