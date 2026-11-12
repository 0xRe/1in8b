const patriarchalCountries=new Set(['CHN','VNM','MNG','UZB','TJK','KGZ','TKM','AZE','TUR']);
const stayRates:Record<string,number>={sa:.85,mena:.7,eap:.6,ssa:.5,lac:.55,eca:.3,hi:.08};
const leaveAges:Record<string,number>={FIN:21.4,SWE:21.5,DNK:21.8,NOR:22,FRA:23.4,NLD:23.5,NZL:23.5,DEU:23.9,USA:24,AUS:24,GBR:24.5,CHE:24.5,AUT:25.3,CAN:25.5,BEL:26,CZE:26,ISR:26,IRL:27,HUN:27,ROU:27.5,POL:28,JPN:28,SGP:29,PRT:29.5,BGR:30,KOR:30,TWN:30,ITA:30.2,ESP:30.2,SVK:30.9,GRC:30.9,SRB:31,HRV:33.4,MNE:33,MKD:32,XKX:32,BIH:31,ALB:31,MLT:30,SVN:29,CYP:27,LUX:27,LVA:26.5,LTU:26,EST:23};
export const childPatriarchal=(id:string,region:string)=>['sa','mena','ssa'].includes(region)||patriarchalCountries.has(id);
export const childStayRate=(id:string,region:string)=>['JPN','KOR','TWN','SGP','HKG','MAC'].includes(id)?.25:region==='eca'&&patriarchalCountries.has(id)?.7:stayRates[region]??.3;
export interface ChildHomeDecision {year:number;outcome:'stay'|'leave';reason:'own'|'university'|'city'|'wedding'|'cohabitation'}
export interface ChildHomePlan {version:1;observedYear:number;country:string;leaveAge:number;staying:boolean;left:boolean;decision?:ChildHomeDecision}
export function childLeaveAge(country:{id:string;region:string},sex:'M'|'F',random:()=>number):number {
 if(childPatriarchal(country.id,country.region)||country.region==='eap')return 0;
 const baseline=leaveAges[country.id]??(({hi:25,eca:28,lac:27} as Record<string,number>)[country.region]??27);
 return Math.max(19,Math.round(baseline+(sex==='F'?-1:1)+(random()+random()-1)*5));
}
export function childDeparture(c:{country:string;region:string;age:number;plannedAge:number;annual:boolean;home:boolean;left:boolean;staying:boolean;married:boolean;parentImprisoned:boolean;childImprisoned:boolean;withdrawn:boolean;rural:boolean;university:boolean;lastChild:boolean},random:()=>number):Omit<ChildHomeDecision,'year'>|null {
 if(!c.annual||!c.home||c.left||c.staying||c.married||c.parentImprisoned||c.childImprisoned)return null;
 let reason:'own'|'university'|'city';
 if(c.plannedAge>0&&c.age>=c.plannedAge&&!c.withdrawn)reason=c.university&&c.age<=23?'university':'own';
 else if(c.plannedAge===0&&c.rural&&c.age>=17&&c.age<=35&&random()<.025)reason='city';
 else return null;
 return {outcome:reason!=='city'&&c.lastChild&&random()<childStayRate(c.country,c.region)?'stay':'leave',reason};
}
