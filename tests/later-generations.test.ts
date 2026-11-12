import assert from 'node:assert/strict';
import test from 'node:test';
import { naturalFamily, findFamilyCheckpoint } from './helpers/adult-family-simulation';
import { yearlyDescendants, familyMembers } from '../src/game/descendants';
import { encodeSave, decodeSave } from '../src/game/storage';
import type { Life, Person } from '../src/game/types';
const hooks = {event:()=>{},name:()=> 'New descendant',mortality:()=>0};
test('grandchildren produce later generations without a spouse and newborns remain zero', () => {
 const life = findFamilyCheckpoint(l=>l.descendants.grandchildren.some(g=>g.alive&&g.age>=25&&g.age<35))!;
 assert.ok(life);
 for (const g of life.descendants.grandchildren) { g.spouse=null; g.marriedYear=null; g.fertilityTarget=9; }
 let born = false;
 for (let i=0;i<18;i++) {
  life.year++; life.age++;
  yearlyDescendants(life,hooks);
  if (life.descendants.greatGrandchildren?.length) {
   assert.ok(life.descendants.greatGrandchildren.some(g=>g.birthYear===life.year&&g.age===0));
   born=true;break;
  }
 }
 assert.ok(born,'later generation must actually be generated');
});

test('five-generation births persist deterministically and both generations reach family UI and annual exports', async () => {
 const {setFocus}=await import('../src/game/engine');
 // Find an actual NGA adult fourth generation at a completed annual boundary.
 const life=findFamilyCheckpoint(l=>l.alive&&!l.pendingDecision&&(!l.timeline||l.timeline.complete)&&!!l.descendants.greatGrandchildren?.some(g=>g.alive&&g.age>=18), "NGA", 160);
 assert.ok(life);
 assert.equal(life.descendants.greatGreatGrandchildren?.length ?? 0, 0);
 for (const g of life.descendants.greatGrandchildren!) g.fertilityTarget=0;
 const parent=life.descendants.greatGrandchildren!.find(g=>g.alive&&g.age>=18)!;
 parent.sex='F';parent.fertilityTarget=9;
 const original=decodeSave(encodeSave(life,[])).life!;
 const run=(start:Life,reload:boolean)=>{
  let l=structuredClone(start);
  // This isolated descendant-year harness starts after the runtime queue has finished.
  assert.ok(!l.timeline || l.timeline.complete);
  delete l.timeline;
  for(let year=0;year<18&&!l.descendants.greatGreatGrandchildren?.length;year++) {
   l.age++;l.year++;l.healthcare.lastCheckedAge=l.age;
   for(const p of [...l.family.parents,...l.family.siblings,...l.family.children,...[l.family.partner,l.family.secondPartner].filter(Boolean)] as Person[]) if(p.alive)p.age++;
   yearlyDescendants(l,hooks);
   l.stats.happiness=Math.min(100,l.stats.happiness);l.stats.social=Math.min(100,l.stats.social);
   l.history.push({...structuredClone(l.history.at(-1)!),age:l.age,annual:null});
   l=setFocus(l,l.focus==='health'?'balanced':'health');
   if(reload)l=decodeSave(encodeSave(l,[])).life!;
  }
  return l;
 };
 const actual=run(original,true);
 assert.deepEqual(actual,run(original,false));
 assert.ok(actual.descendants.greatGreatGrandchildren!.length>0);
 const baby=actual.descendants.greatGreatGrandchildren![0];
 assert.equal(baby.greatGrandchildId,parent.id);assert.equal(baby.age,0);
 assert.ok(familyMembers(actual).some(p=>p.id===baby.id));
 const {translator}=await import('../src/lib/i18n');
 const {recordRows}=await import('../src/lib/record-export');
 assert.equal(recordRows(actual,translator('en')).at(-1)!.at(-1),actual.descendants.greatGreatGrandchildren!.length);
 const React=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');
 const {FamilyDescendants}=await import('../src/components/FamilyDescendants');
 const html=renderToStaticMarkup(React.createElement(FamilyDescendants,{life:actual,locale:'en',t:translator('en')}));
 assert.ok(html.includes('Great-great-grandchildren'));assert.ok(html.includes(baby.name));
 const missingFifth=structuredClone(actual);
 const record=missingFifth.history.at(-1)!.annual!;
 assert.ok(record.greatGreatGrandchildrenAlive!>0);
 record.relativesAlive=record.childrenAlive+Number(record.partner)+(record.grandchildrenAlive??0)+(record.greatGrandchildrenAlive??0);
 assert.throws(()=>decodeSave(JSON.stringify({version:1,life:missingFifth,past:[]})));
 const malformed=structuredClone(actual);malformed.descendants.greatGreatGrandchildren![0].greatGrandchildId='missing';
 assert.throws(()=>decodeSave(JSON.stringify({version:1,life:malformed,past:[]})));
});

test('later-generation fertility excludes dead parents, zero targets and ages above 44', () => {
 const baseline=findFamilyCheckpoint(l=>l.descendants.grandchildren.some(g=>g.alive&&g.age>=25&&g.age<35))!;
 for (const mode of ['dead','zero','past-cutoff'] as const) {
  const life=structuredClone(baseline);
  life.descendants.greatGrandchildren=[];
  life.descendants.greatGreatGrandchildren=[];
  for(const g of life.descendants.grandchildren) {
   g.fertilityTarget=mode==='zero'?0:9;
   if(mode==='dead'){g.alive=false;g.deathAge=g.age;}
   if(mode==='past-cutoff'){g.age=45;g.birthYear=life.year-45;}
  }
  for(let year=0;year<10;year++) {
   life.year++;life.age++;
   yearlyDescendants(life,hooks);
  }
  assert.equal(life.descendants.greatGrandchildren.length,0,mode);
 }
});

test('later generations age without annual death rolls and preserve legacy deaths', () => {
 const life=findFamilyCheckpoint(l=>l.descendants.greatGrandchildren?.some(g=>g.alive))!;
 const child=life.descendants.greatGrandchildren!.find(g=>g.alive)!;
 const age=child.age;
 life.year++;life.age++;
 yearlyDescendants(life,{...hooks,mortality:()=>1});
 assert.equal(child.alive,true);assert.equal(child.age,age+1);
 const after=structuredClone(life);yearlyDescendants(life,hooks);assert.deepEqual(life,after);
 child.alive=false;child.deathAge=child.age;
 life.year++;life.age++;yearlyDescendants(life,hooks);
 assert.equal(child.age,age+1);assert.equal(child.alive,false);
});

test('four-generation milestone occurs once; subsequent births use cumulative event text', () => {
 const life=findFamilyCheckpoint(l=>l.descendants.grandchildren.some(g=>g.alive&&g.age>=25&&g.age<30))!;
 life.descendants.greatGrandchildren=[];life.descendants.greatGreatGrandchildren=[];
 for(const g of life.descendants.grandchildren)g.fertilityTarget=0;
 const parent=life.descendants.grandchildren.find(g=>g.alive&&g.age>=25&&g.age<30)!;
 parent.country='NGA';parent.fertilityTarget=9;parent.earlyLoss=false;
 const births:string[]=[];
 for(let year=0;parent.age<44&&births.length<2;year++) {
  life.year++;life.age++;
  yearlyDescendants(life,{...hooks,event:(_life,key)=>{if(key.startsWith('event.greatGrandchildren'))births.push(key);}});
 }
 assert.ok(births.length>=2);
 assert.equal(births[0],'event.greatGrandchildrenFirst');
 assert.equal(births[1],'event.greatGrandchildrenBorn');
});

test('annual survivor totals cannot exclude recorded living fourth generation', () => {
 const life=findFamilyCheckpoint(l=>l.descendants.greatGrandchildren?.some(g=>g.alive))!;
 const annual=life.history.at(-1)!.annual!;
 assert.ok(annual.greatGrandchildrenAlive!>0);
 const priorMinimum=annual.childrenAlive+Number(annual.partner)+(annual.grandchildrenAlive??0);
 annual.relativesAlive=priorMinimum;
 assert.throws(()=>decodeSave(JSON.stringify({version:1,life,past:[]})), 'living later descendants must be counted in family survivors');
});

test('later-generation birth windows follow player current country, not the descendant household', async () => {
 const {laterGenerationsYear}=await import('../src/game/later-generations');
 const {getCountryById}=await import('../src/game/countries');
 const baseline=findFamilyCheckpoint(l=>l.descendants.grandchildren.some(g=>g.alive&&g.age>=25&&g.age<30))!;
 const parent=baseline.descendants.grandchildren.find(g=>g.alive&&g.age>=25&&g.age<30)!;
 baseline.era='today';
 baseline.descendants.greatGrandchildren=[];baseline.descendants.greatGreatGrandchildren=[];
 for(const g of baseline.descendants.grandchildren)g.fertilityTarget=0;
 parent.fertilityTarget=9;parent.sex='F';parent.age=25;parent.country='NGA';parent.birthYear=baseline.year-25;
 let birthsInNigeria=0;
 for(let seed=0;seed<20;seed++) {
  const korean=structuredClone(baseline);korean.country=getCountryById('KOR')!;korean.descendants.laterRng=seed;
  laterGenerationsYear(korean,hooks);
  assert.equal(korean.descendants.greatGrandchildren!.length,0,'Korean female threshold is31.5 even when parent lives in Nigeria');
  const nigerian=structuredClone(baseline);nigerian.country=getCountryById('NGA')!;nigerian.descendants.laterRng=seed;
  laterGenerationsYear(nigerian,hooks);birthsInNigeria+=nigerian.descendants.greatGrandchildren!.length;
 }
 assert.ok(birthsInNigeria>0,'changing player country changes the eligible birth window');
});

test('great-grandchild early-loss draw happens once on adulthood and permanently prevents births', async () => {
 const {laterGenerationsYear}=await import('../src/game/later-generations');
 const life=findFamilyCheckpoint(l=>l.descendants.greatGrandchildren?.some(g=>g.alive))!;
 for(const g of life.descendants.grandchildren)g.fertilityTarget=0;
 const child=life.descendants.greatGrandchildren![0];
 life.descendants.greatGrandchildren=[child];life.descendants.greatGreatGrandchildren=[];
 child.age=17;child.birthYear=life.year-17;delete child.fertilityTarget;
 life.country={...(await import('../src/game/countries')).getCountryById('NGA')!,u5:1000};life.descendants.laterRng=23;
 life.year++;life.age++;laterGenerationsYear(life,hooks);
 assert.equal(child.age,18);assert.equal(child.fertilityTarget,0);
 for(let i=0;i<25;i++){life.year++;life.age++;laterGenerationsYear(life,hooks);}
 assert.equal(child.fertilityTarget,0);assert.equal(life.descendants.greatGreatGrandchildren.length,0);
});
