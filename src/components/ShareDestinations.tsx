import {useEffect,useId,useRef,useState,useMemo} from 'react';
import {Copy,Share2} from 'lucide-react';
import type {Locale} from '../lib/i18n';
import {shareLinkAction} from '../lib/social-sharing';
import {socialCopy} from '../lib/social-sharing-copy';
import {shareQrMatrix} from '../lib/share-qr';
import {SharePlatforms} from './SharePlatforms';
export function ShareDestinations({text,url,title,locale,onSaveImage,variant='full',onOpenCard}:{text:string;url:string;title:string;locale:Locale;onSaveImage?:()=>void;variant?:'full'|'inline';onOpenCard?:()=>void}){
 const copy=socialCopy(locale),id=useId(),manual=useRef<HTMLTextAreaElement>(null);
 const [status,setStatus]=useState(''),[fallback,setFallback]=useState(''),[guide,setGuide]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{if(fallback)manual.current?.select();},[fallback]);

 const copyText=async(value:string)=>{setFallback('');try{await navigator.clipboard.writeText(value);setStatus(copy.copied);}catch{setFallback(value);setStatus(copy.copyFailed);}};
 const qr=useMemo(()=>{if(variant==='inline')return null;const matrix=shareQrMatrix(url);return {size:matrix.length+8,path:matrix.flatMap((row,y)=>row.map((dark,x)=>dark?`M${x+4} ${y+4}h1v1h-1z`:'')).join('')};},[url,variant]);
 return <section className={`social-sharing social-sharing--${variant}`} aria-labelledby={id}>
  <div className="social-sharing-heading"><h3 id={id}>{copy.destinations}</h3>{variant==='inline'&&<span className="social-domain">1in8bn.com</span>}</div>
  <SharePlatforms text={text} url={url} label={copy.destinations} />
  <div className="social-utilities">
   {onOpenCard&&<button className="social-card-action" type="button" onClick={onOpenCard}><Share2 size={16}/>{copy.imageOptions}</button>}
   <button type="button" disabled={busy} onClick={async()=>{setBusy(true);try{const result=await shareLinkAction(navigator,{title,text,url:url});if(result==='shared'){setStatus(copy.shared);}else if(result==='cancelled'){setStatus(copy.cancelled);}else{try{await navigator.clipboard.writeText(`${text}\n${url}`);setStatus(copy.copied);}catch{setStatus(copy.unavailable);}}}finally{setBusy(false);}}}><Share2 size={16}/>{copy.native}</button>
   <button type="button" onClick={()=>void copyText(url)}><Copy size={16}/>{copy.copyLink}</button>
   {variant==='full'&&<button type="button" onClick={()=>void copyText(text)}><Copy size={16}/>{copy.copyCaption}</button>}
   <button type="button" onClick={()=>void copyText(`${text}\n${url}`)}><Copy size={16}/>{copy.copyPost}</button>
  </div>
  {variant==='full'&&<>
  <p className="social-note">{copy.attach}</p>
  <button className="social-guide-toggle" type="button" aria-expanded={guide} aria-controls={`${id}-guide`} onClick={()=>setGuide(v=>!v)}>{copy.manual}</button>
  {guide&&<div id={`${id}-guide`} className="social-guide"><p>{copy.steps}</p>{onSaveImage&&<button type="button" onClick={onSaveImage}>{copy.saveImage}</button>}<button type="button" onClick={()=>void copyText(`${text}\n${url}`)}>{copy.copyPost}</button></div>}
  {qr&&<div className="social-invitation"><svg role="img" aria-label={copy.scan} viewBox={`0 0 ${qr.size} ${qr.size}`} width="112" height="112"><rect width={qr.size} height={qr.size} fill="white"/><path d={qr.path} fill="#13212a"/></svg><div><strong>{copy.scan}</strong><a href={url}>{url}</a><small>{copy.linkNote}</small></div></div>}
  </>}
  <p role="status" className="social-status">{status}</p>{fallback&&<textarea ref={manual} readOnly aria-label={copy.copyPost} value={fallback}/>}
 </section>;
}
