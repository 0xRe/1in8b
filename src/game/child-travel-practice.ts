/** Source ddKidYear: a single successful bus practice, with annual attempts14–20. */
export function childTravelPractice(prior:number|undefined,c:{age:number;alive:boolean;away:boolean;level:number},draw:()=>number):number|null {
 if(prior!==undefined||!c.alive||c.away||c.level!==2||c.age<14||c.age>20)return null;
 return draw()<.25?c.age:null;
}
