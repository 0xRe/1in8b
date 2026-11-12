export interface CollegeEntryContext {
 country:string;year:number;historical:boolean;imprisoned:boolean;
 job:'student'|'seeking'|'working'|'other';
 /** Explicit original ethnicity/camp facts, not generic refugee status. */
 rohingyaCamp:boolean;rohingyaRakhine:boolean;
}
export interface CollegeEntryResult {
 reason:'allowed'|'prison'|'camp'|'rakhine'|'closed';job:'keep'|'seeking';happiness:number;closureYear:number|null;
}
/** Original college.build guard order; no RNG or qualification mutation. */
export function collegeEntryGate(c:CollegeEntryContext):CollegeEntryResult {
 const base:CollegeEntryResult={reason:'allowed',job:'keep',happiness:0,closureYear:null};
 if(c.imprisoned)return {...base,reason:'prison'};
 if(c.rohingyaCamp&&c.country==='BGD')return {...base,reason:'camp',job:'seeking',happiness:-4};
 if(c.rohingyaRakhine&&c.country==='MMR'&&c.year>=2012&&c.year<=2021)return {...base,reason:'rakhine',job:'seeking',happiness:-4};
 const closed=c.historical&&(
  c.country==='CHN'&&c.year>=1966&&c.year<=1976||
  c.country==='KHM'&&c.year>=1975&&c.year<=1979||
  c.country==='IRN'&&c.year>=1980&&c.year<=1983
 );
 if(closed)return {...base,reason:'closed',job:c.job==='student'?'seeking':'keep',closureYear:c.year};
 return base;
}
