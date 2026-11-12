import assert from 'node:assert/strict';
import test from 'node:test';
import { naturalFamily } from './helpers/adult-family-simulation';
import { yearlyDescendants } from '../src/game/descendants';
import { encodeSave, decodeSave } from '../src/game/storage';
const hooks={event:()=>{},name:()=> 'Baby',mortality:()=>1};
test('existing grandchildren are not subjected to extra annual mortality',()=>{
 const l=[...naturalFamily()].find(l=>l.descendants.grandchildren.some(g=>g.alive))!;
 const g=l.descendants.grandchildren.find(g=>g.alive)!;const age=g.age;
 l.year++;l.age++;yearlyDescendants(l,hooks);
 assert.equal(g.alive,true);assert.equal(g.age,age+1);
});
test('early-loss grandchildren round trip without an invented exact death age',()=>{
 const l=[...naturalFamily()].find(l=>l.descendants.grandchildren.some(g=>g.age===0))!;
 const g=l.descendants.grandchildren.find(g=>g.age===0)!;
 Object.assign(g,{earlyLoss:true,alive:false,deathAge:null,fertilityTarget:0});
 const saved=decodeSave(encodeSave(l,[])).life!;
 assert.equal(saved.descendants.grandchildren.find(x=>x.id===g.id)!.deathAge,null);
 const invalid=structuredClone(l);Object.assign(invalid.descendants.grandchildren.find(x=>x.id===g.id)!,{alive:true});
 assert.throws(()=>decodeSave(encodeSave(invalid,[])));
});
test('birth-time early loss is generated and emits a loss after its birth announcement',()=>{
 let loss=false;
 // Discovered through public actions after child development admission integration.
 for(const l of naturalFamily(28)) {
  const g=l.descendants.grandchildren.find(g=>g.earlyLoss);
  if(!g)continue;
  loss=true;assert.equal(g.alive,false);assert.equal(g.deathAge,null);assert.equal(g.fertilityTarget,0);
  const birth=l.events.findIndex(e=>e.age===g.birthYear-l.birthYear&&(['event.descendantBirth','event.descendantCohabitingBirth','event.descendantSoloBirth'].includes(e.key)&&e.params.baby===g.name||e.key==='event.descendantBirthBatch'));
  const death=l.events.findIndex(e=>e.key==='event.descendantEarlyLoss'&&e.params.name===g.name);
  assert.ok(birth>=0&&death>birth);
  assert.doesNotThrow(()=>decodeSave(encodeSave(l,[])));break;
 }
 assert.ok(loss,'some deterministic births must carry early-loss state');
});
test('early-loss family display omits fabricated age and adult household details',async()=>{
 const l=[...naturalFamily()].find(l=>l.descendants.grandchildren.some(g=>g.age===0))!;
 const g=l.descendants.grandchildren.find(g=>g.age===0)!;
 Object.assign(g,{earlyLoss:true,alive:false,deathAge:null,fertilityTarget:0,name:'EarlyLossFixture'});
 const React=await import('react');const {renderToStaticMarkup}=await import('react-dom/server');
 const {FamilyDescendants}=await import('../src/components/FamilyDescendants');const {translator}=await import('../src/lib/i18n');
 const html=renderToStaticMarkup(React.createElement(FamilyDescendants,{life:l,locale:'en',t:translator('en')}));
 const row=html.slice(html.indexOf('<strong>EarlyLossFixture'),html.indexOf('</p>',html.indexOf('<strong>EarlyLossFixture')));
 assert.ok(row.includes('Died in early childhood · exact age unknown'));assert.ok(!row.includes('Age 0'));assert.ok(!row.includes('Annual income'));
});
