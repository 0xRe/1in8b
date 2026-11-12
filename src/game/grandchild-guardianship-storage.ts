import type {Life} from './types';
import {guardianDecisionId,guardianDecision} from './grandchild-guardianship-runtime';
/** Strict observed-state validation; never discovers past deaths or creates placements. */
export function validateGuardianship(life:Life){
 const data=life.descendants.guardianship;if(data===undefined)return;
 const fail=()=>{throw Error('Invalid or unsupported life save.');};
 const object=(v:any)=>{if(!v||typeof v!=='object'||Array.isArray(v))fail();};
 const integer=(n:any,min:number,max:number)=>{if(!Number.isInteger(n)||n<min||n>max)fail();};
 const ids=(a:any)=>{if(!Array.isArray(a)||new Set(a).size!==a.length||a.some((id:any)=>typeof id!=='string'))fail();};
 object(data);if(data.version!==1||typeof data.departureAnnounced!=='boolean')fail();
 if(!Array.isArray(data.records)||data.records.length>life.family.children.length)fail();
 ids(data.departed);
 const seen=new Set<string>(),home=new Set<string>();
 const death=(parentId:string,year:number)=>{
  const p=life.family.children.find(c=>c.id===parentId);
  if(!p||p.alive||p.deathAge===null)fail();
  integer(year,life.birthYear,life.year);
  if(year<p!.birthYear+p!.deathAge!||year>p!.birthYear+p!.deathAge!+1)fail();
 };
 for(const r of data.records){
  object(r);death(r.parentId,r.observedYear);integer(r.year,r.observedYear,life.year);
  if(seen.has(r.parentId)||!['home','kin','other'].includes(r.choice))fail();seen.add(r.parentId);
  ids(r.childIds);if(!r.childIds.length||r.childIds.length>life.descendants.grandchildren.length)fail();
  if(!Number.isFinite(r.health)||r.health<0||r.health>100)fail();
  if(r.choice==='home'&&(r.year-life.birthYear>78||r.health<35))fail();
  let youngest=18;
  for(const id of r.childIds){
   const g=life.descendants.grandchildren.find(c=>c.id===id);
   if(!g||g.parentId!==r.parentId||g.birthYear>r.observedYear)fail();
   const age=r.year-g!.birthYear;integer(age,0,17);youngest=Math.min(youngest,age);
   if(!g!.alive&&(g!.deathAge===null||g!.birthYear+g!.deathAge<r.year))fail();
   if(r.choice==='home')home.add(id);
  }
  if(r.choice==='kin'){if(r.untilYear!==r.year+Math.max(1,18-youngest))fail();}
  else if(r.untilYear!==undefined)fail();
  if(!Array.isArray(life.decisions)||!life.decisions.includes(guardianDecisionId(r.parentId)))fail();
 }
 for(const id of data.departed){const g=life.descendants.grandchildren.find(c=>c.id===id);if(!g||!home.has(id)||life.year<g.birthYear+19)fail();}
 if(data.departureAnnounced!==(data.departed.length>0))fail();
 if(data.pending!==null){object(data.pending);death(data.pending.parentId,data.pending.year);if(seen.has(data.pending.parentId)||life.alive&&!guardianDecision(life))fail();}
}
