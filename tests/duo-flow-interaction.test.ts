import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import * as React from 'react';
import { createFullDuoState, joinDuo, duoSnapshot } from '../src/lib/duo-engine';
import { duoBirthModel, duoBirthPayload } from '../src/lib/duo-birth';
import { countryProbability } from '../src/game/countries';
const require=createRequire(import.meta.url),{buildSync}=require(require.resolve('esbuild',{paths:[require.resolve('wrangler')]}));
const source=buildSync({stdin:{contents:"export {DuoLifetime} from './src/components/DuoLifetime';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',packages:'external',loader:{'.css':'empty'},define:{'import.meta.env.PROD':'false'}}).outputFiles[0].text;
/** Execute the real component's hooks and event handlers without a browser or SSR-only assertions. */
function harness(snapshot:any,command:(c:any)=>Promise<boolean>=async()=>true){
 let at=0;const slots:any[]=[];
 const hooks={...React,useState:(initial:any)=>{const i=at++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],(v:any)=>slots[i]=typeof v==='function'?v(slots[i]):v];},useRef:(initial:any)=>{const i=at++;return slots[i]??(slots[i]={current:initial});},useEffect:()=>{},useCallback:(fn:any)=>fn,useMemo:(f:()=>any)=>f()};
 const loaded={exports:{} as any};new Function('require','module','exports',source)((id:string)=>id==='react'?hooks:require(id),loaded,loaded.exports);
 function render(){at=0;return loaded.exports.DuoLifetime({snapshot,roomId:'r',token:'secret',busy:false,connected:true,terminal:false,error:'',notice:'',announcement:'',command,shareInvite:async()=>{},renewInvite:async()=>{},inviteAvailable:true,manualInvite:'',onVoice:()=>{},leave:()=>{},reconnect:()=>{}});}
 return {render};
}
function nodes(tree:any):any[]{return !tree||typeof tree!=='object'?[]:Array.isArray(tree)?tree.flatMap(nodes):[tree,...nodes(tree.props?.children)];}
function text(tree:any):string{return typeof tree==='string'?tree:Array.isArray(tree)?tree.map(text).join(''):tree&&typeof tree==='object'?text(tree.props?.children):'';}
function button(tree:any,label:string){const n=nodes(tree).find(n=>n.type==='button'&&text(n)===label);assert.ok(n,`button ${label}`);return n;}
const now=Date.UTC(2026,9,28);
function fixture(){const state=createFullDuoState('component-flow','Ari','a','ha','invite',now);joinDuo(state,'Bea','b','hb','invite',now);return state;}
test('real ready handler atomically submits the explicitly selected pace',async()=>{
 const state=fixture(),sent:any[]=[];const h=harness(duoSnapshot(state,'a',now),async c=>{sent.push(c);return true;});
 const manual=nodes(h.render()).find(n=>n.type==='button'&&text(n).startsWith('Manual'));assert.ok(manual);manual.props.onClick();
 await button(h.render(),'Ready · manual').props.onClick();assert.deepEqual(sent,[{kind:'ready',playback:'manual'}]);
});
test('ordinary personal choice submits once on option tap, including rapid double taps',async()=>{
 const state=fixture();state.phase='planning';state.lifetime!.players.a.life.pendingDecision={id:'ordinary',type:'choice',age:0,key:'Pick',params:{},choices:[{id:'one',key:'One option',params:{}}]};
 const sent:any[]=[];let resolve!:(v:boolean)=>void;const h=harness(duoSnapshot(state,'a',now),c=>{sent.push(c);return new Promise(r=>resolve=r);});const option=button(h.render(),'One option');option.props.onClick();option.props.onClick();
 assert.equal(sent.length,1);assert.equal(sent[0].decisionId,'ordinary');assert.equal(button(h.render(),'One option').props.disabled,true);resolve(true);await Promise.resolve();
});
test('health choice keeps deliberate confirmation and submits the selected exact version',async()=>{
 const state=fixture();state.phase='planning';state.lifetime!.players.a.life.pendingDecision={id:'health',type:'choice',age:0,key:'decision.health.test',params:{},choices:[{id:'care',key:'Consider treatment',params:{}}]};
 const sent:any[]=[];const h=harness(duoSnapshot(state,'a',now),async c=>{sent.push(c);return true;});button(h.render(),'Consider treatment').props.onClick();assert.equal(sent.length,0);await button(h.render(),'Confirm my choice').props.onClick();assert.equal(sent[0].kind,'life-choice');assert.equal(sent[0].choiceId,'care');
});
test('delegation is category opt-in and propose-and-agree is a distinct explicit action',async()=>{
 const state=fixture();state.phase='planning';state.lifetime!.sharedEvent={id:'event',title:'Plan',description:'Terms',options:[{id:'family',label:'Family',description:'Both make time'}],proposal:null};
 const sent:any[]=[];const h=harness(duoSnapshot(state,'a',now),async c=>{sent.push(c);return true;});let tree=h.render();const checkbox=nodes(tree).find(n=>n.type==='input'&&n.props.type==='checkbox');assert.equal(checkbox.props.checked,false);checkbox.props.onChange({target:{checked:true}});await Promise.resolve();assert.deepEqual(sent[0].categories,['temperament']);
 const shared=nodes(h.render()).find(n=>typeof n.type==='function'&&n.type.name==='DuoSharedChoice');
 assert.ok(shared);
 await button(shared.type(shared.props),'Propose and agree to these terms').props.onClick();assert.equal(sent[1].agree,true);
});
test('birth export projects actor only and uses the real birth-weighted probability and public URL',()=>{
 const state=fixture(),snapshot=duoSnapshot(state,'a',now);snapshot.partner!.name='PRIVATE_PEER';const model=duoBirthModel(snapshot),payload=duoBirthPayload(model),serialized=JSON.stringify({model,payload});
 assert.equal(model.percent,countryProbability(snapshot.lifetime!.self.life.migration.birthCountry,'births')*100);assert.equal(payload.url,'https://1in8bn.com/together/');assert.doesNotMatch(serialized,/PRIVATE_PEER|credential|token|roomId|1 in \d+/i);
});
test('birth reveal closes and reopens from persistent controls while voice stays outside tabs',()=>{
 const state=fixture();state.phase='planning';const h=harness(duoSnapshot(state,'a',now));let tree=h.render();
 assert.equal(nodes(tree).some(n=>typeof n.type==='function'&&n.type.name==='DuoBirthReveal'),false);
 const previous=globalThis.requestAnimationFrame;globalThis.requestAnimationFrame=(()=>0) as any;
 try{button(h.render(),'Our beginnings').props.onClick();tree=h.render();const reveal=nodes(tree).find(n=>typeof n.type==='function'&&n.type.name==='DuoBirthReveal');assert.ok(reveal);reveal.props.onClose();assert.equal(nodes(h.render()).some(n=>n.type===reveal.type),false);const voice=nodes(tree).find(n=>typeof n.type==='function'&&n.type.name==='DuoVoice');assert.ok(voice);assert.equal(voice.props.compact,true);assert.ok(nodes(tree).find(n=>n.type==='div'&&n.props.className==='dl-tools').props.children[0].type===voice.type);}finally{globalThis.requestAnimationFrame=previous;}
});
test('currency selection reformats own net worth locally and age-zero story uses progress wording',()=>{
 const state=fixture();state.phase='planning';const snapshot=duoSnapshot(state,'a',now),h=harness(snapshot);const selector=nodes(h.render()).find(n=>typeof n.type==='function'&&n.type.name==='MoneyRegionSelect'&&n.props.value==='USD');assert.ok(selector);selector.props.onChange('GBP');const tree=h.render();assert.match(text(tree),/UK prices/);assert.match(text(tree),/Save my progress/);assert.doesNotMatch(text(tree),/Download my complete story/);
});
