/** Simulation purchasing-power factors, not current exchange rates or tuition advice. */
const costs:Readonly<Record<string,number>>={USA:1.5,GBR:1.3,AUS:1.2,CAN:1.1,NZL:1.1,IRL:1,SGP:1.1,CHE:.8,NLD:.85,SWE:.9,DNK:.9,FIN:.8,NOR:.55,ISR:.8,ARE:.8,JPN:.65,KOR:.6,DEU:.45,FRA:.5,BEL:.5,AUT:.45,ESP:.55,ITA:.5,PRT:.45,CZE:.45,POL:.4,HUN:.5,SVK:.4,GRC:.4};
const clamp=(n:number,low:number,high:number)=>Math.max(low,Math.min(high,n));
export interface StudyQuote {originPPP:number;destination:string;destinationPPP:number;graduate:boolean;languageMatches:boolean;}
export function overseasQuote(c:StudyQuote):number{
 const purchasingPower=clamp(.11*Math.sqrt(c.originPPP/1000),.22,1.25);
 const destinationCost=costs[c.destination]??clamp((c.destinationPPP||20000)/60000,.25,.8);
 return (c.graduate?40000:30000)/purchasingPower*destinationCost*(c.languageMatches?1:1.15);
}
/** Input has already passed geographic/access eligibility. Persist this result once per offer. */
export function selectStudyDestinations(weights:Readonly<Record<string,number>>,draw:()=>number):string[]{
 const available=Object.entries(weights).filter(([,weight])=>Number.isFinite(weight)&&weight>0);
 if(!available.length)return [];
 const pick=(entries:typeof available)=>{
  let remainder=draw()*entries.reduce((total,[,weight])=>total+weight,0);
  for(const [country,weight] of entries){remainder-=weight;if(remainder<0)return country;}
  return entries[entries.length-1][0];
 };
 const selected=[pick(available)];
 const popular=available.reduce((best,entry)=>entry[1]>best[1]?entry:best)[0];
 if(!selected.includes(popular))selected.push(popular);
 while(selected.length<Math.min(3,available.length))selected.push(pick(available.filter(([country])=>!selected.includes(country))));
 return selected;
}
