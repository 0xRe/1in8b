import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import * as React from 'react';
const require=createRequire(import.meta.url),{buildSync}=require(require.resolve('esbuild',{paths:[require.resolve('wrangler')]}));
const source=buildSync({stdin:{contents:"export {MoneyRegionSelect,moneyRegionOptions} from './src/components/MoneyRegionSelect';",resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'cjs',packages:'external',loader:{'.css':'empty'}}).outputFiles[0].text;
function nodes(tree:any):any[]{return !tree||typeof tree!=='object'?[]:Array.isArray(tree)?tree.flatMap(nodes):[tree,...nodes(tree.props?.children)];}
function harness(locale='en',disabled=false){
 let at=0,focused='',scrolled='';const slots:any[]=[],pending:any[]=[],listeners=new Map<string,Function>(),changed:string[]=[];
 const effect=(fn:Function,deps:any[])=>{const i=at++,previous=slots[i];if(!previous||deps.some((v,n)=>v!==previous.deps[n])){previous?.cleanup?.();slots[i]={deps};pending.push(()=>slots[i].cleanup=fn());}};
 const hooks={...React,useId:()=> 'test',useState:(initial:any)=>{const i=at++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return[slots[i],(v:any)=>slots[i]=typeof v==='function'?v(slots[i]):v];},useRef:(initial:any)=>{const i=at++;return slots[i]??(slots[i]={current:initial});},useMemo:(fn:Function)=>fn(),useEffect:effect,useLayoutEffect:effect};
 const loaded={exports:{} as any};new Function('require','module','exports',source)((id:string)=>id==='react'?hooks:require(id),loaded,loaded.exports);
 const previousWindow=globalThis.window,previousDocument=globalThis.document;
 globalThis.window={innerWidth:320,innerHeight:600,addEventListener:()=>{},removeEventListener:()=>{}} as any;
 globalThis.document={addEventListener:(key:string,fn:Function)=>listeners.set(key,fn),removeEventListener:(key:string)=>listeners.delete(key)} as any;
 const props={locale,disabled,value:'USD',label:'Amounts in',onChange:(code:string)=>changed.push(code)};
 function render(){at=0;const tree=loaded.exports.MoneyRegionSelect(props);for(const node of nodes(tree)){if(node.props?.ref)node.props.ref.current={focus:()=>focused=node.type,contains:(target:any)=>target?.inside===true,getBoundingClientRect:()=>node.props.role==='listbox'?({top:100,bottom:220}):({left:12,top:400,right:308,bottom:444,width:296}),get scrollTop(){return 0;},set scrollTop(value:number){assert.equal(value,72);},querySelector:(selector:string)=>({getBoundingClientRect:()=>{scrolled=selector;return {top:240,bottom:292};},scrollIntoView:()=>{throw new Error('Must not scroll document ancestors');}})};}while(pending.length)pending.shift()();return tree;}
 return {render,changed,listeners,options:loaded.exports.moneyRegionOptions,get focused(){return focused;},get scrolled(){return scrolled;},dispose(){for(const slot of slots)slot?.cleanup?.();globalThis.window=previousWindow;globalThis.document=previousDocument;}};
}
function find(tree:any,role:string){const node=nodes(tree).find(n=>n.props?.role===role);assert.ok(node,role);return node;}
function search(tree:any){const node=nodes(tree).find(n=>n.type==='input');assert.ok(node);return node;}
function key(node:any,key:string){let prevented=false,stopped=false;node.props.onKeyDown({key,preventDefault:()=>prevented=true,stopPropagation:()=>stopped=true});return {prevented,stopped};}
test('real picker localizes currency names and filters localized, English, ISO, country, symbol and accents',()=>{
 const h=harness('fr');try{
  assert.equal(h.options('fr','Allemagne')[0].code,'EUR_DE');assert.equal(h.options('fr','Germany')[0].code,'EUR_DE');assert.equal(h.options('fr','United States')[0].code,'USD');assert.equal(h.options('fr','jpy')[0].code,'JPY');assert.equal(h.options('fr','Japan')[0].code,'JPY');assert.equal(h.options('fr','bresil')[0].code,'BRL');assert.equal(h.options('fr','€').length,4);assert.ok(h.options('fr','yen')[0].currency.includes('yen'));
  key(find(h.render(),'combobox'),' ');let tree=h.render();assert.equal(h.focused,'input');assert.equal(find(tree,'option').props['aria-selected'],false);
  search(tree).props.onChange({target:{value:'jpy'}});tree=h.render();assert.equal(nodes(tree).filter(n=>n.props?.role==='option').length,1);assert.equal(find(tree,'option').props['data-code'],'JPY');
  key(search(tree),'Enter');assert.deepEqual(h.changed,['JPY']);assert.equal(h.focused,'button');assert.equal(find(h.render(),'combobox').props['aria-expanded'],false);
 }finally{h.dispose();}
});
test('arrows, Home, End select an active descendant, Escape closes without changing and restores focus',()=>{
 const h=harness();try{
  key(find(h.render(),'combobox'),'ArrowDown');let tree=h.render();assert.equal(find(tree,'combobox').props['aria-expanded'],true);
  const options=nodes(tree).filter(n=>n.props?.role==='option');key(search(tree),'Home');tree=h.render();assert.equal(search(tree).props['aria-activedescendant'],options[0].props.id);
  key(search(tree),'ArrowDown');tree=h.render();assert.equal(search(tree).props['aria-activedescendant'],options[1].props.id);assert.ok(h.scrolled.includes(options[1].props['data-code']));
  key(search(tree),'End');tree=h.render();assert.equal(search(tree).props['aria-activedescendant'],options.at(-1).props.id);
  const event=key(search(tree),'Escape');assert.deepEqual(event,{prevented:true,stopped:true});assert.equal(h.focused,'button');assert.deepEqual(h.changed,[]);assert.equal(find(h.render(),'combobox').props['aria-expanded'],false);
 }finally{h.dispose();}
});
test('mouse selection, empty results, outside click, Tab, blur and disabled opening use actual handlers',()=>{
 const h=harness();try{
  find(h.render(),'combobox').props.onClick();let tree=h.render();const selected=nodes(tree).find(n=>n.props?.role==='option'&&n.props['aria-selected']);assert.equal(selected.props['data-code'],'USD');
  tree=h.render();const panel=nodes(tree).find(n=>n.props?.className==='money-select-panel');assert.equal(panel.props.style.width,304);assert.equal(panel.props.style.left,8);assert.ok(panel.props.style.bottom!==undefined,'opens above a low trigger');
  selected.props.onClick();assert.deepEqual(h.changed,['USD']);find(h.render(),'combobox').props.onClick();tree=h.render();search(tree).props.onChange({target:{value:'no-such-country'}});tree=h.render();assert.equal(search(tree).props['aria-activedescendant'],undefined);assert.ok(find(tree,'status'));key(search(tree),'Enter');assert.deepEqual(h.changed,['USD']);
  h.listeners.get('pointerdown')!({target:{inside:false}});assert.equal(find(h.render(),'combobox').props['aria-expanded'],false);
  find(h.render(),'combobox').props.onClick();tree=h.render();assert.equal(key(search(tree),'Tab').prevented,false);assert.equal(find(h.render(),'combobox').props['aria-expanded'],false);
  find(h.render(),'combobox').props.onClick();tree=h.render();tree.props.onBlur({currentTarget:{contains:()=>false},relatedTarget:{}});assert.equal(find(h.render(),'combobox').props['aria-expanded'],false);
 }finally{h.dispose();}
 const disabled=harness('en',true);try{const trigger=find(disabled.render(),'combobox');assert.equal(trigger.props.disabled,true);trigger.props.onClick();assert.equal(find(disabled.render(),'combobox').props['aria-expanded'],false);}finally{disabled.dispose();}
});
