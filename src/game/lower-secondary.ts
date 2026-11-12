/** Original school2 rules. Contextual access, latent knowledge and historical facts are supplied by the caller. */
export interface LowerSecondaryContext {
 country:string;birthRegion:string;year:number;age:number;transition:number;quintile:number;
 knowledge:number;knowledgeZ:number;topMarkAge:number|null;war:number;
 homeSchool:boolean;learningCentre:boolean;banned:boolean;returning:boolean;
}
const freeSchool:Record<string,number>={CHN:2008,VNM:2010,PRK:1975,MYS:2012};
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
export function lowerSecondaryAdmission(c:LowerSecondaryContext):number {
 const p=clamp(Math.max(c.transition,.1),.0001,.9999);
 const effort=1.15*(c.age<=13?1.7:2.05)*Math.exp(.85*clamp(c.knowledgeZ,-3,3)-.85**2/2);
 return p*effort/(1-p+p*effort);
}
function automatic(c:LowerSecondaryContext):boolean {
 return !c.banned&&(['hi','eca'].includes(c.birthRegion)||c.transition>.985||c.transition>.97&&c.quintile>=2);
}
function free(c:LowerSecondaryContext):boolean {return !c.banned&&freeSchool[c.country]!==undefined&&c.year>=freeSchool[c.country];}
export type LowerSecondaryChoice='home'|'work'|'go';
export interface LowerSecondaryPlan {
 kind:'enrolled'|'childwork'|'choice';route:'homeSchool'|'learningCentre'|'automatic'|'freeSchool'|'banned'|'application';
 retention?:number;choices?:LowerSecondaryChoice[];
}
/** This is an entry transaction, not a render-time selector: learning-centre admission may consume one draw. */
export function planLowerSecondary(c:LowerSecondaryContext,draw:()=>number):LowerSecondaryPlan {
 if(c.homeSchool)return {kind:'enrolled',route:'homeSchool'};
 if(c.learningCentre)return {kind:c.year>=2021&&draw()<.5?'enrolled':'childwork',route:'learningCentre'};
 if(automatic(c))return {kind:'enrolled',route:'automatic'};
 if(free(c))return {kind:'enrolled',route:'freeSchool',retention:clamp(lowerSecondaryAdmission(c),.05,1)};
 return {kind:'choice',route:c.banned?'banned':'application',choices:c.banned?['home','work']:['go','work']};
}
export interface LowerSecondaryResult {
 kind:'enrolled'|'childwork'|'keepWork';forcePaid:boolean;knowledge:number;happiness:number;social:number;retry:boolean;
}
export function resolveLowerSecondaryChoice(c:LowerSecondaryContext,choice:LowerSecondaryChoice,draw:()=>number):LowerSecondaryResult|null {
 if(c.homeSchool||c.learningCentre||automatic(c)||free(c)||choice==='home'&&!c.banned||choice==='go'&&c.banned)return null;
 const result:LowerSecondaryResult={kind:'childwork',forcePaid:false,knowledge:0,happiness:0,social:0,retry:false};
 if(choice==='home')return {...result,knowledge:5,happiness:-3};
 if(choice==='work')return c.returning?{...result,kind:'keepWork'}:{...result,forcePaid:true,social:3};
 const admitted=draw()<lowerSecondaryAdmission(c);
 const top=c.quintile>=4&&(c.knowledge>=90||c.topMarkAge!==null&&c.age-c.topMarkAge<=2)&&!c.banned;
 return admitted||top?{...result,kind:'enrolled'}:{...result,happiness:-6,retry:c.quintile<=3&&c.war<1};
}
/** null skips the RNG draw; unlike primary school, developmental protection is checked first. */
export function lowerSecondaryDropoutProbability(retention:number|undefined,completedYears:number,duration:number,persistent:boolean,developmentalProtection:boolean):number|null {
 if(retention===undefined||completedYears<1||completedYears>=duration||developmentalProtection)return null;
 return (persistent?.8:1)*(1-clamp(retention,.01,1)**(1/(duration-1)));
}
