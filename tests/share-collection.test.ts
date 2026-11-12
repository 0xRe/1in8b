import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createLife,DEFAULT_SETTINGS} from '../src/game/engine';
import {getCountryById} from '../src/game/countries';
import {translator} from '../src/lib/i18n';
import {beginningFacts,comparisonCandidates,selectedComparison,collectionCaption,journeyEndingWords} from '../src/lib/share-collection';
import {imageZip} from '../src/lib/image-zip';
import {shareImagesAction,threadsPost,shareIntents} from '../src/lib/social-sharing';
function ended(seed:number){const l=createLife(DEFAULT_SETTINGS,seed);l.age=70;l.year=l.birthYear+70;l.alive=false;return l;}

test('retrospective birth facts never substitute later country, household, income or religion',()=>{
 const l=ended(123),before=structuredClone(beginningFacts(l));l.country=getCountryById('JPN')!;l.residence=l.residence==='urban'?'rural':'urban';l.stats.incomeQuintile=5;l.family.children=[];l.family.parents=[];
 assert.deepEqual(beginningFacts(l),before);assert.deepEqual(Object.keys(before).sort(),['birthYear','country','name','seed','sex']);
});
test('comparison excludes live and classroom saves, deduplicates and limits selection to four actual lives',()=>{
 const main=ended(1),others=[2,3,4,5].map(ended),live=createLife(DEFAULT_SETTINGS,6),classroom=ended(7);classroom.settings.classroom=true;
 const pool=comparisonCandidates(main,[main,...others,live,classroom]);assert.equal(pool.length,5);assert.equal(pool[0],main);
 const selected=selectedComparison([...pool,live,classroom],[main.id,main.id,'missing',live.id,classroom.id,...others.map(l=>l.id)]);assert.equal(selected.length,4);assert.equal(new Set(selected).size,4);assert.ok(selected.every(l=>!l.alive&&!l.settings.classroom));
});
test('captions name selected lives only, preserve own words and omit private reflections',()=>{
 const a=ended(1),b=ended(2),t=translator('zh-hans');a.reflections={'30':'PRIVATE SECRET'};
 const comparison=collectionCaption('comparison',[b,a],'zh-hans',t,'这是我的两段人生');assert.ok(comparison.startsWith('这是我的两段人生'));assert.ok(comparison.indexOf(b.name)<comparison.indexOf(a.name));assert.ok(!comparison.includes('PRIVATE SECRET'));
 assert.equal(collectionCaption('comparison',[a],'en',translator('en')),'');assert.equal(collectionCaption('comparison',[a,a],'en',translator('en')),'');
 assert.ok(collectionCaption('journey',[a],'en',translator('en')).includes(String(a.birthYear)));a.settings.classroom=true;assert.equal(collectionCaption('journey',[a],'en',translator('en')),'');
});
test('native sharing receives both ordered PNGs and checks that exact group before handing it off',async()=>{
 const files=[new File(['birth'],'01-birth.png',{type:'image/png'}),new File(['ending'],'02-ending.png',{type:'image/png'})];let checked:File[]|undefined,received:ShareData|undefined;
 const content={title:'My life',text:'My story',url:'https://1in8bn.com/'};
 assert.equal(await shareImagesAction({canShare:data=>{checked=data.files;return true;},share:async data=>{received=data;}},files,content),'shared');assert.equal(checked,files);assert.equal(received?.files,files);assert.equal(received?.text,'My story\nhttps://1in8bn.com/');
 let calls=0;assert.equal(await shareImagesAction({canShare:()=>false,share:async()=>{calls++;}},files,content),'unsupported');assert.equal(calls,0);
 assert.equal(await shareImagesAction({canShare:()=>true,share:async()=>{throw new DOMException('cancel','AbortError');}},files,content),'cancelled');
 assert.equal(await shareImagesAction({canShare:()=>true,share:async()=>{throw Error('not available');}},files,content),'unavailable');assert.equal(await shareImagesAction({},[],content),'unsupported');
});
test('ZIP extracts ordered PNG bytes through an independent standard ZIP reader, with valid CRCs',()=>{
 const dir=mkdtempSync(join(tmpdir(),'1in8bn-zip-'));
 try{const zip=imageZip([{name:'01-birth.png',data:new Uint8Array([1,2,3,255])},{name:'02-ending.png',data:new Uint8Array([7,8,9])}]);const path=join(dir,'cards.zip');writeFileSync(path,zip);
  const result=JSON.parse(execFileSync('python3',['-c','import zipfile,json,sys; z=zipfile.ZipFile(sys.argv[1]); print(json.dumps({"names":z.namelist(),"files":[list(z.read(n)) for n in z.namelist()],"bad":z.testzip()}))',path],{encoding:'utf8'}));
  assert.deepEqual(result,{names:['01-birth.png','02-ending.png'],files:[[1,2,3,255],[7,8,9]],bad:null});
 }finally{rmSync(dir,{recursive:true,force:true});}
 assert.throws(()=>imageZip([{name:'../private.png',data:new Uint8Array()}]));assert.throws(()=>imageZip([]));
});
test('Threads drafts retain their invitation, encode the bounded draft and never cut emoji surrogate pairs',()=>{
 const url='https://1in8bn.com/zh-hans/?via=threads',text='我的人生🌏'.repeat(180),post=threadsPost(text,url);
 assert.ok(Array.from(post).length<=500);assert.ok(post.endsWith('\n'+url));assert.ok(post.includes('…'));assert.ok(!post.includes('\ufffd'));
 assert.equal(new URL(shareIntents(text,url).threads).searchParams.get('text'),post);assert.equal(threadsPost('Short caption',url),'Short caption\n'+url);
});

test('the paired ending remembers family without auto-sharing causes or private journal text',()=>{
 const l=ended(1),t=translator('en');l.reflections={'20':'PRIVATE SECRET'};l.cause='cause.placeholder';const words=journeyEndingWords(l,t,'My own words');assert.ok(words.includes('My own words'));assert.ok(words.includes('Children:'));assert.ok(!/PRIVATE SECRET|cause.placeholder|Cause of death/.test(words));
});

test('an unusually long encoded display name cannot crowd the invitation out of a Threads draft',()=>{
 const url=new URL('https://1in8bn.com/zh-hans/?born=JPN&life=abc-70-2026-F-2-35-1');url.searchParams.set('n','長'.repeat(48));url.searchParams.set('via','threads');
 const draft=threadsPost('My life',url.href),last=draft.split('\n').at(-1)!;assert.ok(Array.from(draft).length<=500);assert.equal(new URL(last).searchParams.get('life'),'abc-70-2026-F-2-35-1');assert.equal(new URL(last).searchParams.get('born'),'JPN');
});

test('same-name and same-age lives retain their distinct records and expose their life grain in captions',()=>{
 const a=ended(1),b=ended(2),t=translator('en');b.name=a.name;b.age=a.age;
 const selected=comparisonCandidates(a,[b]);assert.equal(selected.length,2);const caption=collectionCaption('comparison',selected,'en',t);assert.ok(caption.includes(t('grain.unmeasured')));assert.ok(caption.includes('1. '+a.name));assert.ok(caption.includes('2. '+b.name));
});
