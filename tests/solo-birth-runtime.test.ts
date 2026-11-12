import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife,DEFAULT_SETTINGS} from '../src/game/engine';
import {familyChoice} from './helpers/adult-family-simulation';
import {encodeSave,decodeSave} from '../src/game/storage';
import {translator} from '../src/lib/i18n';
test('normal gameplay can generate solo births and preserves their history through later family changes',()=>{
 let found=false;const sexes=new Set<string>();let singleEvents=0;
 for(let seed=1;seed<=80&&sexes.size<2;seed++)for(const country of ['BRA','NGA']){
  if(sexes.size===2)break;
  let life=createLife({...DEFAULT_SETTINGS,country,gentler:true,dailyThemeDay:'2026-10-20'},seed);
  for(let step=0;step<500&&life.alive;step++){
   life=familyChoice(life);
   const babies=life.descendants.grandchildren.filter(g=>g.origin?.union==='solo');
   if(!babies.length)continue;
   found=true;
   for(const baby of babies){const parent=life.family.children.find(c=>c.id===baby.parentId)!;sexes.add(parent.sex);assert.equal(baby.origin!.household,parent.sex==='M'?'otherParent':'parent');}
   life=decodeSave(encodeSave(life,[])).life!;
   const singles=life.events.filter(e=>e.key==='event.descendantSoloBirth');
   singleEvents+=singles.length;for(const event of singles)assert.doesNotMatch(translator('en')(event.key,event.params),/spouse|partner/);
  }
 }
 assert.ok(found,'actual solo birth must be reached without injecting a plan or baby');
 assert.equal(sexes.size,2,'exercise both mothers and fathers');assert.ok(singleEvents>0);
});
