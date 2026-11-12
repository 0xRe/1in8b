/** Original child admission rules. Callers supply observed facts; no facts are inferred here. */
const clamp=(value:number,low:number,high:number)=>Math.max(low,Math.min(high,value));
const centers:Record<string,number>={ssa:.61,sa:.48,lac:.55,hi:.67,eap:.63,mena:.48,eca:.64};
export function childHomeQuintile(percentile:number,region:string,parentQuintile:number|null):number {
 const own=clamp(3+(percentile-(centers[region]??.6))*5,.5,5.5);
 return parentQuintile===null?own:Math.max(own,parentQuintile);
}
export interface ChildAdmissionProbability {
 transitions:readonly [number,number,number,number];parentDegree:boolean;tutoringYears:number;
 privateMultiplier:number;placementMultiplier:number;aspirationMultiplier:number;disabilityMultiplier:number;closed:boolean;
}
export function childAdmissionProbability(c:ChildAdmissionProbability):number {
 // The source's outer gate must precede its internal probability floor.
 if(c.closed||c.disabilityMultiplier===0)return 0;
 let p=c.transitions.reduce((product,value)=>product*value,1);
 if(c.parentDegree){p=clamp(p,.0001,.9999);p=p*2/(1-p+p*2);}
 p=Math.min(.95,p*(1+.25*c.tutoringYears)*c.privateMultiplier*c.placementMultiplier*c.aspirationMultiplier*c.disabilityMultiplier);
 return clamp(1-Math.sqrt(1-p),.01,.97);
}
export interface ChildAdmissionState {
 attemptedAge:18|19;
 path:null|'pending'|'university'|'work';
}
export interface ChildAdmissionContext {
 age:number;alive:boolean;imprisoned:boolean;companion:boolean;outsideCare:boolean;
 severeDisability:boolean;closed:boolean;probability:number;
}
/** Does not mutate input. Funding acceptance resolves pending separately, without another draw. */
export function advanceChildAdmission(state:ChildAdmissionState|undefined,c:ChildAdmissionContext,random:()=>number):ChildAdmissionState|undefined {
 if(!c.alive||state?.path||c.age!==18&&c.age!==19||(state&&state.attemptedAge>=c.age))return state;
 if(c.age===18&&(c.imprisoned||c.companion))return state;
 if(c.age===19&&(c.imprisoned||c.severeDisability))return {attemptedAge:19,path:'work'};
 // Original chance(0) still owns a draw. Do not let a zero probability become an admission.
 const admitted=random()<(c.closed||c.severeDisability?0:c.probability);
 return {attemptedAge:c.age,path:admitted?(c.age===18&&!c.outsideCare?'pending':'university'):c.age===19?'work':null};
}

/** Source-game educational modifiers; not predictions about any real person's abilities. */
export function childDevelopmentAdmission(birth:import('./birth-development').BirthDevelopment|undefined,observations:import('./child-learning-observation').ChildLearningObservations|undefined):{multiplier:number;severe:boolean} {
 const development=birth?.developmental;
 const severe=!!development&&development.supportLevel>=2;
 let multiplier = development ? (severe ? 0 : (development.kind === 'intellectual' || development.intellectualDisability) ? 0.43 : 0.66) : 1;
 const learning=birth?.attentionLearning;
 if(learning?.adhd)multiplier *= observations?.adhd?.diagnosed ? 0.73 : 0.7;
 if(learning?.dyslexia)multiplier *= observations?.dyslexia?.diagnosed ? 0.41 : 0.36;
 return {multiplier,severe};
}
