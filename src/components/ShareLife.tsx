import './birth-experience.css';
import { useEffect, useState } from 'react';
import { Copy, Download, Share2 } from 'lucide-react';
import type { Life } from '../game/types';
import type { Locale, translator } from '../lib/i18n';
import { canvasBlob, downloadBlob, drawLifeCard, mediaCanvas, shareText } from '../lib/life-media';
import { drawBirthShareCard, birthCardFacts } from '../lib/birth-card';
import { birthCopy } from '../lib/birth-experience-copy';
import { birthInvitationUrl, shareImageAction, shareLinkAction, copyImageAction } from '../lib/social-sharing';
import {ShareDestinations} from './ShareDestinations';
import {socialCopy} from '../lib/social-sharing-copy';
import { lifeShareUrl } from '../lib/life-share';
import { lifePost } from '../lib/viral-copy';
import { storyMoments, momentPost } from '../lib/share-story';
import { ShareStoryPicker } from './ShareStoryPicker';
import { storyCopy } from '../lib/share-story-copy';
import {ShareCollection} from './ShareCollection';
import {collectionCopy} from '../lib/share-collection-copy';

type Format='feed'|'story';
type Artifact={locale:Locale;life:Life;format:Format;comment:string;eventId:string;blob:Blob;url:string};
export function ShareLife({life,past=[],locale,t,initialMode='single',initialMoment=''}:{life:Life;past?:readonly Life[];locale:Locale;t:ReturnType<typeof translator>;initialMode?:'single'|'journey'|'comparison';initialMoment?:string}){
 const [mode,setMode]=useState<'single'|'journey'|'comparison'>(initialMode),copy=collectionCopy(locale);
 if(life.settings.classroom)return <p>{t('classroomHelp')}</p>;
 return <div className="share-workspace"><div className="share-mode-tabs" role="group" aria-label={t('feature.shareFriends')}>{(['single','journey','comparison'] as const).map(value=><button type="button" key={value} aria-pressed={mode===value} disabled={value==='journey'&&life.alive} onClick={()=>{setMode(value);}}>{copy[value]}</button>)}</div>{mode==='single'?<SingleLifeShare life={life} locale={locale} t={t} initialMoment={initialMoment}/>:<ShareCollection key={`${life.id}-${mode}`} kind={mode} life={life} past={past} locale={locale} t={t}/>}</div>;
}
function SingleLifeShare({life,locale,t,initialMoment=''}:{life:Life;locale:Locale;t:ReturnType<typeof translator>;initialMoment?:string}) {
 const [eventId,setEventId]=useState(initialMoment),[comment,setComment]=useState(''),[format,setFormat]=useState<Format>('feed'),[artifact,setArtifact]=useState<Artifact|null>(null),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(false);
 const copy=birthCopy(locale),social=socialCopy(locale),isBirth=life.alive&&life.age===0;
 const story=storyCopy(locale),moments=storyMoments(life,eventId),event=moments.find(e=>e.id===eventId),mode=event?'moment':'life';
 const country=life.migration?.birthCountry??life.country,url=lifeShareUrl(birthInvitationUrl(locale,country.id),life);
 const facts=birthCardFacts(life,locale),text=event?momentPost(life,event,locale,t,comment):isBirth?[shareText(life,locale,t,comment),`${copy.odds}: ${new Intl.NumberFormat(locale==='zh'?'zh-Hant':locale,{style:'percent',maximumFractionDigits:2}).format(facts.birthPercent/100)}`,copy.challenge].join('\n'):!life.alive?lifePost(life,locale,t,comment):shareText(life,locale,t,comment);
 const ready=artifact?.locale===locale&&artifact.life===life&&artifact.format===format&&artifact.comment===comment&&artifact.eventId===(event?.id??'');
 useEffect(()=>{
  let active=true;setError(false);setStatus('');
  const timer=setTimeout(()=>{void document.fonts.ready.then(async()=>{
   const canvas=mediaCanvas(1080,format==='feed'?1350:1920);
   if(isBirth)drawBirthShareCard(canvas,life,locale,t,comment);else drawLifeCard(canvas,life,locale,t,comment,event);
   const blob=await canvasBlob(canvas);if(active)setArtifact({locale,life,format,comment,eventId:event?.id??'',blob,url:canvas.toDataURL('image/png')});
  }).catch(()=>{if(active){setError(true);setStatus(t('feature.imageError'));}});},comment?160:0);
  return()=>{active=false;clearTimeout(timer);};
 },[life,locale,comment,format,t,isBirth,event,mode]);

 const save=()=>{if(!ready||!artifact)return;downloadBlob(artifact.blob,`${life.id}-${isBirth?'birth':'life'}-${format}.png`);setStatus(t('feature.imageSaved'));};
 const share=async()=>{
  if(!ready||!artifact||busy)return;setBusy(true);setStatus('');
  const file=new File([artifact.blob],`${isBirth?'birth':'life'}-${format}.png`,{type:'image/png'});
  const result=await shareImageAction(navigator,file,{title:isBirth?copy.certificate:life.name,text,url:url});

  if(result==='shared'){setStatus(copy.shared);}
  else if(result==='unsupported'||result==='unavailable'){
   // Browsers without file sharing (in-app browsers, some desktops) still pass on the caption and
   // link: their share sheet when there is one, otherwise the clipboard. 5 of 16 attempts hit this.
   const linkUrl=url;
   const link=await shareLinkAction(navigator,{title:isBirth?copy.certificate:life.name,text,url:linkUrl});

   if(link==='shared'){setStatus(copy.shared);}
   else if(link==='cancelled')setStatus(social.cancelled);
   else{
    try{await navigator.clipboard.writeText(`${text}\n${url}`);setStatus(social.copied);}
    catch{setStatus(copy.fallback);}
   }
  }
  else if(result==='cancelled')setStatus(social.cancelled);
  setBusy(false);
 };
 return <div className="share-life share-life--editor">
   <div className="share-controls">
     <p className="eyebrow">{isBirth?copy.certificate:life.alive?social.snapshot:t('feature.lifeRemembered')}</p><h2>{isBirth?copy.shareTitle:t('feature.shareFriends')}</h2><p className="share-intro">{isBirth?copy.shareIntro:life.alive?social.snapshotIntro:t('feature.sharePrivacy')}</p>
     {!isBirth&&<ShareStoryPicker life={life} locale={locale} t={t} selected={event?.id??''} onSelect={id=>{setEventId(id);}}/>}
     <section className="share-story-words" aria-label={story.caption}>
       <label htmlFor="share-comment">{story.yourWords}<small>{story.optional}</small></label>
       <textarea id="share-comment" maxLength={160} value={comment} onChange={e=>setComment(e.target.value)} placeholder={t('feature.rememberPlaceholder')}/>
       <p className="share-caption-label">{story.caption}</p><p className="share-copy">{text}</p>
     </section>
     <button className="primary share-primary" disabled={busy||!ready} onClick={()=>void share()}><Share2 size={20}/><span>{copy.shareImage}<small>{copy.channels}</small></span></button>
     <div className="share-destinations">
       <button id="cardSaveBtn" disabled={!ready} onClick={save}><Download size={16}/>{social.saveImage}</button>
       <button disabled={!ready||busy} onClick={async()=>{if(!artifact||!ready)return;setBusy(true);try{const copied=await copyImageAction(navigator,artifact.blob);setStatus(copied?social.imageCopied:social.imageFailed);}finally{setBusy(false);}}}><Copy size={16}/>{social.copyImage}</button>
     </div>
     <ShareDestinations text={text} url={url} title={isBirth?copy.certificate:life.name} locale={locale} onSaveImage={ready?save:undefined}/>
     <fieldset className="share-format"><legend>{copy.format}</legend>{(['feed','story'] as const).map(value=><button key={value} aria-pressed={format===value} onClick={()=>setFormat(value)}>{copy[value]}</button>)}</fieldset>

     <p className="share-attach-note">{copy.attach}</p><p className="share-privacy-note">{isBirth?copy.privacy:t('feature.sharePrivacy')}</p>
     <p className="share-status" role="status">{status}</p>
   </div>
   <div className="share-preview" aria-busy={!ready&&!error}>{ready&&artifact?<img id="cardImg" src={artifact.url} alt={t('feature.cardAlt',{name:life.name})} width={1080} height={format==='feed'?1350:1920}/>:<p role="status">{t(error?'feature.imageError':'feature.preparingCard')}</p>}</div>
 </div>;
}
