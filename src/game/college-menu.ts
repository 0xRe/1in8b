export type CollegeChoice='apply'|'work'|'abroad'|'army'|'navy'|'air';
export interface CollegeMenuContext {
 country:string;kind:'ordinary'|'equivalency'|'reopened';working:boolean;domesticFallback:boolean;
 freeExit:boolean;papersValid:boolean;familyAbroad:boolean;recentlyFled:boolean;money:number;abroadCost:number;
 /** Fully resolved acadOK and acadJP facts; do not infer from residence alone. */
 academyEligible:boolean;japaneseDefenseAcademy:boolean;
}
export interface CollegeMenu {
 choices:CollegeChoice[];abroad:'hidden'|'locked'|'study'|'scholarship';academy:'threeBranches'|'jp'|'cn'|'generic'|null;
}
const threeBranches=new Set(['KOR','USA','TWN','THA','IDN','PHL','TUR','GBR','FRA','RUS','BRA','EGY','PAK','MEX','CHL','ARG']);
/** Original college.build options, after entry guards. No eligibility assumptions or random draws. */
export function collegeMenu(c:CollegeMenuContext):CollegeMenu {
 const result:CollegeMenu={choices:['apply','work'],abroad:'hidden',academy:null};
 if(c.kind==='reopened'||c.kind==='equivalency'&&c.working)return result;
 if(!c.domesticFallback&&c.freeExit&&c.papersValid){
  if(c.familyAbroad)result.abroad=c.recentlyFled?'scholarship':'study';
  else if(c.money>=c.abroadCost)result.abroad='study';
  else if(!c.recentlyFled)result.abroad='locked';
  if(result.abroad==='study'||result.abroad==='scholarship')result.choices.push('abroad');
 }
 if(c.academyEligible){
  result.academy=threeBranches.has(c.country)?'threeBranches':c.japaneseDefenseAcademy?'jp':c.country==='CHN'?'cn':'generic';
  result.choices.push('army');
  if(result.academy==='threeBranches')result.choices.push('navy','air');
 }
 return result;
}
