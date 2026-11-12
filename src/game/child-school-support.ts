export interface ChildSchoolSupport {age:number;kind:'special'|'home'|'supported'|'unsupported'}
interface Context {age:number;alive:boolean;away:boolean;level:1|2|3;recognized:boolean;diagnosed:boolean;ppp:number;region:string;year:number}
export function childSchoolSupport(prior:ChildSchoolSupport|undefined,c:Context,draw:()=>number):ChildSchoolSupport|null {
 if(prior||!c.alive||c.away)return null;
 if(c.level===1?(!c.recognized||c.age<7||c.age>9):c.age!==6)return null;
 const rich=c.ppp>=15000&&['hi','eca'].includes(c.region);
 const access=Math.max(.03,Math.min(.9,.03+.87*(Math.log(c.ppp)-Math.log(1500))/(Math.log(60000)-Math.log(1500))))*(c.year<1980&&c.region!=='hi'?.5:1);
 const available=(c.level>=2||c.diagnosed)&&(rich||draw()<access);
 return {age:c.age,kind:c.level>=2?(available?'special':'home'):(available?'supported':'unsupported')};
}
