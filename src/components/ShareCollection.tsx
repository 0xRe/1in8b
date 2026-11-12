import {useEffect,useMemo,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Download,Share2} from 'lucide-react';
import {FaThreads} from 'react-icons/fa6';
import type {Life} from '../game/types';
import type {Locale,translator} from '../lib/i18n';
import {countryName} from '../game/countries';
import {canvasBlob,downloadBlob,drawLifeCard,mediaCanvas} from '../lib/life-media';
import {drawBeginningCard,drawComparisonCard} from '../lib/share-collection-media';
import {beginningFacts,comparisonCandidates,selectedComparison,collectionCaption,journeyEndingWords,type CollectionKind} from '../lib/share-collection';
import {collectionCopy,fillCollection} from '../lib/share-collection-copy';
import {socialCopy} from '../lib/social-sharing-copy';
import {storyCopy} from '../lib/share-story-copy';
import {birthCopy} from '../lib/birth-experience-copy';
import {birthInvitationUrl,shareImageAction,shareImagesAction,shareLinkAction,shareIntents,threadsPost} from '../lib/social-sharing';
import {lifeShareUrl} from '../lib/life-share';
import {localeUrl} from '../lib/site-url';
import {imageZip} from '../lib/image-zip';
import {lifeGrain} from '../lib/life-insights';
import {ShareDestinations} from './ShareDestinations';
import {Portrait} from './Visuals';
import './share-collection.css';

type Asset={name:string;label:string;blob:Blob;url:string};
type Artifact={key:string;assets:Asset[]};
export function ShareCollection({kind,life,past,locale,t}:{kind:CollectionKind;life:Life;past:readonly Life[];locale:Locale;t:ReturnType<typeof translator>}){
 const copy=collectionCopy(locale),social=socialCopy(locale),story=storyCopy(locale),birth=birthCopy(locale);
 const candidates=useMemo(()=>comparisonCandidates(life,past),[life,past]);
 const [ids,setIds]=useState(()=>candidates.slice(0,2).map(l=>l.id)),[comment,setComment]=useState(''),[format,setFormat]=useState<'feed'|'story'>('feed'),[active,setActive]=useState(0),[artifact,setArtifact]=useState<Artifact|null>(null),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState(false);
 const selected=useMemo(()=>kind==='journey'?[life]:selectedComparison(candidates,ids),[kind,life,candidates,ids]);
 const eligible=!life.settings.classroom&&(kind==='journey'?!life.alive:selected.length>=2);
 const text=collectionCaption(kind,selected,locale,t,comment),url=kind==='journey'?lifeShareUrl(birthInvitationUrl(locale,beginningFacts(life).country.id),life):localeUrl(locale);
 const threadDraft=threadsPost(text,url),threadShortened=Array.from(text+'\n'+url).length>500;
 const key=JSON.stringify([kind,locale,format,selected.map(l=>l.id),comment]);
 const ready=eligible&&artifact?.key===key;
 const assets=ready?artifact.assets:[],current=assets[Math.min(active,assets.length-1)];
 const touch=useRef<{x:number;y:number}|null>(null);

 useEffect(()=>{
  if(!eligible)return;
  let cancelled=false;const made:Asset[]=[];setError(false);setStatus('');
  const timer=setTimeout(()=>void document.fonts.ready.then(async()=>{
   const size=[1080,format==='feed'?1350:1920] as const;
   const specs=kind==='journey'?[{name:'01-birth.png',label:copy.beginning},{name:'02-ending.png',label:copy.ending}]:[{name:'01-lives-comparison.png',label:copy.comparisonTitle}];
   for(const [index,spec] of specs.entries()){
    const canvas=mediaCanvas(...size);
    if(kind==='comparison')drawComparisonCard(canvas,selected,locale,t,url,comment);
    else if(index===0)drawBeginningCard(canvas,life,locale,t,url);
    else drawLifeCard(canvas,life,locale,t,journeyEndingWords(life,t,comment),undefined,true);
    const blob=await canvasBlob(canvas);if(cancelled)return;
    made.push({...spec,blob,url:URL.createObjectURL(blob)});
   }
   if(!cancelled){setArtifact({key,assets:made});}
  }).catch(()=>{if(!cancelled){setError(true);setStatus(t('feature.imageError'));}}),comment?160:0);
  return()=>{cancelled=true;clearTimeout(timer);for(const asset of made)URL.revokeObjectURL(asset.url);};
 },[eligible,key,kind,life,selected,locale,t,format,comment,url,copy]);
 const share=async()=>{
  if(!ready||busy)return;setBusy(true);setStatus('');
  const title=kind==='journey'?copy.journeyTitle:copy.comparisonTitle;
  try{
   const files=assets.map(asset=>new File([asset.blob],asset.name,{type:'image/png'}));
   const result=await shareImagesAction(navigator,files,{title,text,url:url});

   if(result==='shared'){setStatus(social.shared);return;}
   if(result==='cancelled'){setStatus(social.cancelled);return;}
   if(files.length>1){
    const singleFile=files[active]||files[0];
    const singleResult=await shareImageAction(navigator,singleFile,{title,text,url:url});

    if(singleResult==='shared'){setStatus(social.shared);return;}
    if(singleResult==='cancelled'){setStatus(social.cancelled);return;}
   }
   const link=await shareLinkAction(navigator,{title,text,url:url});

   if(link==='shared'){setStatus(social.shared);return;}
   if(link==='cancelled'){setStatus(social.cancelled);return;}
   try{
    await navigator.clipboard.writeText(`${text}\n${url}`);
    setStatus(social.copied);
   }catch{
    setStatus(copy.fallback);
   }
  }finally{setBusy(false);}
 };
 const saveImage=(asset:Asset)=>{downloadBlob(asset.blob,asset.name);};
 const saveZip=async()=>{
  if(!ready||busy)return;setBusy(true);setStatus('');
  try{const entries=await Promise.all(assets.map(async a=>({name:a.name,data:new Uint8Array(await a.blob.arrayBuffer())})));const bytes=imageZip(entries);downloadBlob(new Blob([bytes as BlobPart],{type:'application/zip'}),`1in8bn-${kind}.zip`);setStatus(copy.saved);}
  catch{setStatus(t('feature.imageError'));}finally{setBusy(false);}
 };
 if(life.settings.classroom)return <p>{copy.private}</p>;
 return <section className="share-collection" aria-label={kind==='journey'?copy.journeyTitle:copy.comparisonTitle}>
  <header className="collection-heading"><p className="eyebrow">1in8bn.com</p><h2>{kind==='journey'?copy.journeyTitle:copy.comparisonTitle}</h2></header>
  {kind==='comparison'&&<fieldset className="comparison-picker"><legend>{copy.choose}</legend><p>{fillCollection(copy.selection,{n:selected.length})}</p>
   {candidates.length<2&&<p className="collection-empty">{copy.empty}</p>}
   <div className="comparison-options">{candidates.map(l=>{const chosen=selected.some(s=>s.id===l.id);return <button key={l.id} type="button" aria-pressed={chosen} disabled={!chosen&&selected.length>=4} onClick={()=>{setIds(prev=>chosen?prev.filter(id=>id!==l.id):[...prev,l.id]);setActive(0);}}><Portrait seed={l.seed} age={l.age} sex={l.sex}/><span><strong>{l.name}</strong><small>{countryName(beginningFacts(l).country,locale)} · {t('years',{n:l.age})}</small><small>{t(lifeGrain(l).nameKey)}</small></span><span aria-hidden="true" className="comparison-check">{chosen?'✓':'+'}</span></button>;})}</div>
  </fieldset>}
  <div className="collection-layout">
   <div className="collection-gallery">
    <div className="collection-image" aria-busy={!ready&&!error} tabIndex={0} onKeyDown={e=>{if(assets.length>1&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();setActive(n=>(n+(e.key==='ArrowLeft'?-1:1)+assets.length)%assets.length);}}} onTouchStart={e=>{touch.current={x:e.changedTouches[0].clientX,y:e.changedTouches[0].clientY};}} onTouchEnd={e=>{const start=touch.current;touch.current=null;if(!start||assets.length<2)return;const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.2)setActive(n=>(n+(dx<0?1:-1)+assets.length)%assets.length);}}>
     {current?<img src={current.url} alt={current.label} width="1080" height={format==='feed'?1350:1920}/>:<p role="status">{!eligible?copy.needTwo:t(error?'feature.imageError':'feature.preparingCard')}</p>}
    </div>
    {assets.length>1&&<div className="collection-pages" role="group" aria-label={birth.preview}><button type="button" aria-label={copy.previous} onClick={()=>setActive(n=>(n+assets.length-1)%assets.length)}><ArrowLeft size={16}/></button>{assets.map((asset,index)=><button key={asset.name} type="button" aria-pressed={active===index} onClick={()=>setActive(index)}><span>{index+1} / {assets.length}</span>{asset.label}</button>)}<button type="button" aria-label={copy.next} onClick={()=>setActive(n=>(n+1)%assets.length)}><ArrowRight size={16}/></button></div>}
    <div className="collection-actions">
     <button className="primary" type="button" disabled={!ready||busy} onClick={()=>void share()}><Share2 size={18}/>{fillCollection(copy.share,{n:assets.length|| (kind==='journey'?2:1)})}</button>
     <button type="button" disabled={!ready||busy} onClick={()=>{if(kind==='journey')void saveZip();else if(current)saveImage(current);}}><Download size={17}/>{kind==='journey'?copy.save:social.saveImage}</button>
     {kind==='journey'&&<div className="collection-save-images">{assets.map(asset=><button type="button" key={asset.name} onClick={()=>saveImage(asset)}><Download size={15}/>{fillCollection(copy.download,{name:asset.label})}</button>)}</div>}
    </div>
    <p className="collection-status" role="status">{status}</p>
   </div>
   <div className="collection-post">
    <label htmlFor="collection-comment">{story.yourWords}<small>{story.optional}</small></label><textarea id="collection-comment" maxLength={160} value={comment} onChange={e=>setComment(e.target.value)} placeholder={t('feature.rememberPlaceholder')}/>
    <fieldset className="share-format"><legend>{birth.format}</legend>{(['feed','story'] as const).map(value=><button type="button" key={value} aria-pressed={format===value} onClick={()=>setFormat(value)}>{birth[value]}</button>)}</fieldset>
    <p className="collection-caption-label">{story.caption}</p><p className="collection-caption">{text||copy.needTwo}</p>
    <p className="collection-guide">{copy.guide}</p><p className="collection-thread-count">Threads · {Array.from(threadDraft).length} / 500{threadShortened&&<span>{copy.threadLimit}</span>}</p>
    {eligible&&<><a className="collection-threads" href={shareIntents(text,url).threads} target="_blank" rel="noopener noreferrer" ><FaThreads size={20}/>{copy.attach}</a><ShareDestinations text={text} url={url} title={kind==='journey'?copy.journeyTitle:copy.comparisonTitle} locale={locale} onSaveImage={current?()=>saveImage(current):undefined}/></>}
    <p className="collection-privacy">{copy.private}</p>
   </div>
  </div>
 </section>;
}
