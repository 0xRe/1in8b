const clamp=(value:number,low:number,high:number)=>Math.max(low,Math.min(high,value));
const rates:Record<string,number>={eap:.05,sa:.06,ssa:.05,mena:.05,lac:.03,eca:.02,hi:.004};
const overrides:Record<string,number>={KOR:.03,TWN:.03,CHN:.05,VNM:.06,SGP:.03,JPN:.004,HKG:.03};
export interface ChildSupportContext {
 /** force bypasses the age gate for a retirement projection; requested help is a separate mechanic. */
 age:number;retired:boolean;force:boolean;separatedFromNorthKorea:boolean;year:number;
 country:string;region:string;medianIncome:number;householdPercentile:number;savings:number;social:number;
}
export interface SupportingChild {
 id:string;alive:boolean;age:number;
 /** Source withMe flag, not the broader assumption that all home-resident children are excluded. */
 withParent:boolean;separatedStepfamily:boolean;exFamily:boolean;blockedJob:boolean;imprisoned:boolean;
 lastRequestYear:number|null;medianIncome:number;abroad:boolean;degreeJob:boolean;agriculture:boolean;
 away:boolean;gives:boolean;previousRequests:number;
}
/** Source recurring parental support. Callers own annual settlement and rounding; no random draws. */
export function childSupport(c:ChildSupportContext,children:readonly SupportingChild[]):{id:string;amount:number}[] {
 if(c.age<60&&!c.retired&&!c.force||c.separatedFromNorthKorea)return [];
 const rate=overrides[c.country]??rates[c.region]??.02;
 const parentFactor=clamp(1.4-c.householdPercentile,.3,1)*(c.savings>c.medianIncome*10?.5:1)*clamp(.5+c.social/100,.5,1.3);
 const contributions:{id:string;amount:number}[]=[];
 for(const child of children){
  if(!child.alive||child.age<25||child.withParent||child.separatedStepfamily||child.exFamily||child.blockedJob||child.imprisoned||
    child.lastRequestYear!==null&&c.year-child.lastRequestYear<=1)continue;
  if(contributions.length>=5)break;
  const amount=child.medianIncome*rate*(child.abroad?1.4:1)*(child.degreeJob?1.5:child.agriculture?.6:1)*
    (child.away?.3:1)*(child.age>=65?.5:1)*(child.gives?1.2:1)*Math.min(1.3,1+.03*child.previousRequests)*parentFactor;
  contributions.push({id:child.id,amount});
 }
 return contributions;
}
