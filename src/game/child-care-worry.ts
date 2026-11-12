/** Source ddKidYear: concern is a one-time event, separate from making a care plan. */
export function childCareWorry(prior:number|undefined,c:{parentAge:number;childAge:number;alive:boolean;level:number;staying:boolean;away:boolean;planned:boolean;year:number},draw:()=>number):number|null {
 if(prior!==undefined||c.parentAge<55||c.childAge<18||!c.alive||c.level<2||!c.staying||c.away||c.planned)return null;
 return draw()<.15?c.year:null;
}
