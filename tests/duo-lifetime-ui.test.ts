import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createFullDuoState, joinDuo, duoSnapshot, type DuoSnapshot } from '../src/lib/duo-engine';

const require=createRequire(import.meta.url);
const {buildSync}=require(require.resolve('esbuild',{paths:[require.resolve('wrangler')]}));
const source=buildSync({stdin:{contents:"export {DuoLifetime} from './src/components/DuoLifetime';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',packages:'external',loader:{'.css':'empty'},define:{'import.meta.env.PROD':'false'}}).outputFiles[0].text;
const loaded={exports:{} as {DuoLifetime:React.ComponentType<any>}};
new Function('require','module','exports',source)(require,loaded,loaded.exports);
const now=Date.UTC(2026,9,28);
function fixture(join=true){const state=createFullDuoState('ui-test','Ari','a','hash-a','invite',now);if(join)joinDuo(state,'Bea','b','hash-b','invite',now);return state;}
function render(snapshot:DuoSnapshot){return renderToStaticMarkup(createElement(loaded.exports.DuoLifetime,{snapshot,roomId:'ui-test',token:'PRIVATE_TOKEN',busy:false,connected:true,terminal:false,error:'',notice:'',announcement:'',command:async()=>true,shareInvite:async()=>{},renewInvite:async()=>{},inviteAvailable:true,manualInvite:'',onVoice:()=>{},leave:()=>{},reconnect:()=>{}}));}
function footer(html:string){return html.slice(html.indexOf('<footer'));}

test('lobby renders four actual tab panels and explicit optional playback consent before readiness',()=>{
 const html=render(duoSnapshot(fixture(), 'a',now));
 assert.equal((html.match(/role="tab"/g)??[]).length,4);
 assert.equal((html.match(/role="tabpanel"/g)??[]).length,4);
 assert.equal((html.match(/aria-labelledby="dl-tab-[^"]+" hidden=""/g)??[]).length,3);
 assert.match(html,/Automatic · recommended/);
 assert.match(html,/Your life pace/);
 assert.match(html,/Ready · automatic/);
 assert.match(html,/class="dl-lobby"/);
 assert.doesNotMatch(html,/Room menu|class="dl-menu"/);
 assert.match(html,/Leave temporarily/);
 assert.match(html,/End room/);
 assert.match(footer(html),/hidden=""/);
 assert.match(render(duoSnapshot(fixture(false),'a',now)),/Invite your friend/);
 assert.ok(html.indexOf('aria-label="Voice chat"')<html.indexOf('class="dl-content"'),'voice lives outside the tab panel container');
});

test('personal event requires selecting a translated choice and shows only the friend’s public profile',()=>{
 const state=fixture();state.phase='planning';
 state.lifetime!.players.a.life.pendingDecision={id:'own-decision',type:'choice',age:0,key:'Choose your own path',params:{},choices:[{id:'one',key:'A choice for you',params:{}}]};
 const peer=state.lifetime!.players.b.life;peer.name='Bea Character';peer.reflections={x:'PRIVATE_REFLECTION_TEXT'};peer.events.push({id:'secret-event',year:2026,age:0,key:'PRIVATE_HEALTH_HISTORY',params:{},kind:'health',icon:'x'});peer.stats.netAssets=987654321;
 const html=render(duoSnapshot(state,'a',now));
 assert.match(html,/Your choice · the shared clock is waiting/);
 assert.match(html,/A choice for you/);
 assert.match(footer(html),/disabled=""[^>]*>Tap an option to choose/);
 assert.doesNotMatch(html,/PRIVATE_HEALTH_HISTORY|PRIVATE_REFLECTION_TEXT|987654321|PRIVATE_TOKEN/);
 assert.match(html,/Bea Character/);assert.match(html,/played by Bea/);assert.match(html,/class="dl-card dl-passport dl-friend-card"/);
});

test('shared proposal footer navigates to complete terms instead of approving hidden consent',()=>{
 const state=fixture();state.phase='planning';
 state.lifetime!.sharedEvent={id:'shared',title:'A real agreement',description:'Discuss the next three years.',options:[{id:'focus:family',label:'Prioritize connection',description:'Both change their current priority for three years. Either may later change direction.'}],proposal:{version:7,optionId:'focus:family',proposerId:'b',approvals:['b'],lifeVersions:[0,0]}};
 const html=render(duoSnapshot(state,'a',now));
 assert.match(footer(html),/View shared choice/);
 assert.doesNotMatch(footer(html),/I agree|shared-approve/);
 assert.match(html,/Both change their current priority for three years/);
 assert.match(html,/I agree to this exact proposal/);
 assert.match(html,/id="dl-shared"[^>]+hidden=""/);
});

test('surviving friend continues while deceased actor has a read-only ending action',()=>{
 const state=fixture();state.phase='planning';state.lifetime!.players.a.life.alive=false;state.lifetime!.players.a.life.age=74;
 const html=render(duoSnapshot(state,'a',now));
 assert.match(html,/Your friend’s life continues/);
 assert.match(footer(html),/Read my life story/);
 assert.doesNotMatch(footer(html),/>Continue life</);
 state.phase='complete';state.lifetime!.players.b.life.alive=false;
 assert.match(footer(render(duoSnapshot(state,'a',now))),/View our memories/);
});

test('desktop shell separates navigation, story/context columns and contextual action; mobile keeps the same four accessible destinations',()=>{
 const state=fixture();state.phase='planning';state.lifetime!.players.a.life.age=12;
 const html=render(duoSnapshot(state,'a',now));
 const navigation=html.slice(html.indexOf('<nav class="dl-navigation"'),html.indexOf('</nav>')+6);
 assert.equal((navigation.match(/role="tab"/g)??[]).length,4);
 for(const id of ['life','shared','chat','memories'])assert.match(navigation,new RegExp(`aria-controls="dl-${id}"`));
 assert.ok(html.indexOf('class="dl-navigation"')<html.indexOf('class="dl-content"'));
 assert.doesNotMatch(footer(html),/<nav|role="tab"/);
 assert.match(html,/class="dl-life-story"/);
 assert.match(html,/class="dl-card dl-passport"/);
 assert.match(html,/<aside class="dl-life-context" aria-label="My character and everyday life">/);
 assert.match(html,/My character, family &amp; finances/);
 assert.match(html,/Delegate routine choices/);
 assert.match(html,/Shape my everyday life/);
});

test('actual navigation handlers change visible panels, preserve all destinations and support keyboard focus',()=>{
 // Execute the component's handlers with a minimal hook host, without pretending to run a browser layout.
 const React=require('react');const states:unknown[]=[];let cursor=0;
 const hooks={...React,useState:(initial:any)=>{const i=cursor++;if(!(i in states))states[i]=typeof initial==='function'?initial():initial;return [states[i],(value:any)=>{states[i]=typeof value==='function'?value(states[i]):value;}];},useEffect:()=>{},useCallback:(fn:any)=>fn,useMemo:(fn:any)=>fn(),useRef:()=>({current:null})};
 const mod={exports:{} as {DuoLifetime:Function}};new Function('require','module','exports',source)((id:string)=>id==='react'?hooks:require(id),mod,mod.exports);
 const snapshot=duoSnapshot(fixture(),'a',now);
 const props={snapshot,roomId:'ui-test',token:'private',busy:false,connected:true,terminal:false,error:'',notice:'',announcement:'',command:async()=>true,shareInvite:async()=>{},renewInvite:async()=>{},inviteAvailable:true,manualInvite:'',onVoice:()=>{},leave:()=>{},reconnect:()=>{}};
 const draw=()=>{cursor=0;return mod.exports.DuoLifetime(props);};
 const flatten=(node:any):any[]=>!node||typeof node!=='object'?[]:[node,...React.Children.toArray(node.props?.children).flatMap(flatten)];
 const oldFrame=globalThis.requestAnimationFrame;const oldDocument=globalThis.document;let focused='';
 globalThis.requestAnimationFrame=((fn:any)=>{fn();return 0;}) as any;
 globalThis.document={getElementById:(id:string)=>({focus:()=>{focused=id;}})} as any;
 try{
  for(const id of ['shared','chat','memories','life']){
   flatten(draw()).find(n=>n.props?.id===`dl-tab-${id}`).props.onClick();
   const tree=flatten(draw());assert.equal(tree.find(n=>n.props?.id===`dl-${id}`).props.hidden,false);
   assert.equal(tree.filter(n=>n.props?.role==='tabpanel'&&!n.props.hidden).length,1);
  }
  let prevented=false;flatten(draw()).find(n=>n.props?.id==='dl-tab-life').props.onKeyDown({key:'End',preventDefault:()=>{prevented=true;}});
  assert.equal(prevented,true);assert.equal(focused,'dl-tab-memories');
  assert.equal(flatten(draw()).find(n=>n.props?.id==='dl-memories').props.hidden,false);
 }finally{globalThis.requestAnimationFrame=oldFrame;globalThis.document=oldDocument;}
});
