/** Audited school3 admission rules. The life adapter must provide current policy and birth-country access separately. */
export interface SpecialistSchool {kind:'art'|'sport';hobby:string;level:number}
export interface UpperSecondaryContext {
 country:string;birthCountry:string;year:number;age:number;transition:number;quintile:number;
 knowledgeZ:number;knowledge:number;urban:boolean;homeSchool:boolean;refugeeCamp:boolean;
 refugee:boolean;irregular:boolean;returning:boolean;specialist:SpecialistSchool|null;
}
export type UpperSecondaryChoice='go'|'voc'|'arts'|'work';
export interface UpperSecondaryPlan {
 kind:'enrolled'|'childwork'|'seeking'|'choice';choices?:UpperSecondaryChoice[];retention?:number;
}
export interface UpperSecondaryResult {
 kind:'enrolled'|'childwork'|'seeking'|'keepWork';stage?:'upperSecondary'|'vocational';
 forcePaid:boolean;happiness:number;hobbyGain:number;specialist?:SpecialistSchool;retention?:number;
}
const reforms:Record<string,number>={ITA:2007,FRA:1968,GBR:1972,BEL:1983,NLD:2007,PRT:2012,TUR:2012,AUT:2017,RUS:2007,USA:2000,PRK:1975};
const generalFallback=new Set(['KOR','JPN','TWN']);
const artHobbies=new Set(['art','music','dance','drama','crafts','craft','photo']);
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
function free(c:UpperSecondaryContext){return reforms[c.country]!==undefined&&c.year>=reforms[c.country]&&!c.refugee&&!c.irregular;}
function admission(c:UpperSecondaryContext,vocational=false){
 const transition=vocational?Math.max(c.transition,Math.min(.98,c.transition*1.2+.1)):c.transition;
 const p=clamp(Math.max(transition,.08),.0001,.9999);
 const effort=1.15*(c.age<=13?1.7:2.05)*Math.exp(.85*clamp(c.knowledgeZ,-3,3)-.85**2/2);
 return p*effort/(1-p+p*effort);
}
export function selectSpecialistSchool(birthPPP:number,alreadySpecialist:boolean,hobbies:readonly {id:string;since:number;level:number}[]):SpecialistSchool|null {
 if(birthPPP<8000||alreadySpecialist)return null;
 const eligible=hobbies.filter(h=>h.since<=13&&h.level>=2);
 const best=(predicate:(id:string)=>boolean)=>eligible.filter(h=>predicate(h.id)).sort((a,b)=>b.level-a.level)[0];
 const art=best(id=>artHobbies.has(id)),sport=best(id=>id==='sport'||id.startsWith('sp_'));
 const selected=art&&(!sport||art.level>=sport.level)?art:sport;
 return selected?{kind:selected===art?'art':'sport',hobby:selected.id,level:selected.level}:null;
}
export function planUpperSecondary(c:UpperSecondaryContext):UpperSecondaryPlan {
 if(c.homeSchool)return {kind:'enrolled',...(free(c)?{retention:clamp(admission(c),.05,1)}:{})};
 if(c.refugeeCamp)return {kind:c.age<15?'childwork':'seeking'};
 if(c.country==='PRK'&&free(c))return {kind:'enrolled',retention:clamp(admission(c),.05,1)};
 const choices:UpperSecondaryChoice[]=['go',...(c.specialist?['arts' as const]:[]),'voc'];
 if(!(c.transition>.96&&(c.quintile>=2||generalFallback.has(c.birthCountry))||free(c)))choices.push('work');
 return {kind:'choice',choices};
}
/** Returns effects without mutating a life; caller commits the decision receipt exactly once. */
export function resolveUpperSecondary(c:UpperSecondaryContext,choice:UpperSecondaryChoice,draw:()=>number):UpperSecondaryResult|null {
 if(!planUpperSecondary(c).choices?.includes(choice))return null;
 const work:UpperSecondaryResult={kind:c.age<15?'childwork':'seeking',forcePaid:false,happiness:0,hobbyGain:0};
 if(choice==='work')return {...work,kind:c.returning?'keepWork':work.kind,forcePaid:!c.returning&&c.age<15};
 let happiness=0;
 if(choice==='arts'){
  const candidate=c.specialist!;
  const probability=clamp(.15+.08*candidate.level+(c.quintile-3)*.05+(c.knowledge-50)/400,.12,.6)*(c.urban?1:.6);
  if(draw()<probability)return {...work,kind:'enrolled',stage:'upperSecondary',specialist:candidate,happiness:5,hobbyGain:2};
  happiness=-3;
 }
 const vocational=choice==='voc',p=admission(c,vocational);
 if(free(c)||draw()<p)return {...work,kind:'enrolled',stage:vocational?'vocational':'upperSecondary',happiness,...(free(c)?{retention:clamp(p,.05,1)}:{})};
 if(!vocational&&c.transition>.9&&draw()<Math.min(.98,c.transition*1.2+.1))return {...work,kind:'enrolled',stage:generalFallback.has(c.birthCountry)?'upperSecondary':'vocational',happiness};
 return {...work,happiness:happiness-6};
}
