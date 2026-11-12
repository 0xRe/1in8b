import { useEffect, useMemo, useState } from 'react';
import { Copy, Download, Share2 } from 'lucide-react';
import { SharePlatforms } from './SharePlatforms';
import { canvasBlob, mediaCanvas } from '../lib/life-media';
import { duoShareModel, duoSharePayload, duoComposerText, drawDuoKeepsake, sharePreparedDuoCard, DUO_CARD_FILENAME, type DuoPreparedCard, type DuoShareModel } from '../lib/duo-keepsake';
import type { DuoSnapshot } from '../lib/duo-engine';
import './duo-keepsake.css';

export function DuoKeepsake({snapshot}:{snapshot:DuoSnapshot}){
 const content = JSON.stringify(duoShareModel(snapshot));
 const model = useMemo(() => JSON.parse(content) as DuoShareModel, [content]);
 const payload=useMemo(()=>duoSharePayload(model),[model]);
 const [card,setCard]=useState<DuoPreparedCard|null>(null),[preview,setPreview]=useState(''),[notice,setNotice]=useState(''),[failed,setFailed]=useState(false);
 useEffect(()=>{let active=true,url='';setCard(null);setPreview('');setFailed(false);
  void(async()=>{try{await document.fonts?.ready;const canvas=mediaCanvas(1080,1350);drawDuoKeepsake(canvas,model);const file=new File([await canvasBlob(canvas)],DUO_CARD_FILENAME,{type:'image/png'});if(!active)return;url=URL.createObjectURL(file);setPreview(url);setCard({...payload,file});}catch{if(active)setFailed(true);}})();
  return()=>{active=false;if(url)URL.revokeObjectURL(url);};
 },[model,payload]);
 if(!model.chapters.length)return null;
 async function copyCaption(){try{await navigator.clipboard.writeText(payload.text);setNotice('Caption copied. Paste it alongside your image.');}catch{setNotice('Copying is unavailable. Select the caption below and copy it.');}}
 function download(){if(!card)return;const url=URL.createObjectURL(card.file),a=document.createElement('a');a.href=url;a.download=DUO_CARD_FILENAME;a.click();setTimeout(()=>URL.revokeObjectURL(url),30_000);}
 async function share(){if(!card)return;const result=await sharePreparedDuoCard(card);if(result==='shared'){setNotice('Image handed to your sharing app.');}else if(result==='unsupported')setNotice('This browser cannot share image files. Download the image, then attach it in Threads or your messaging app.');else if(result==='failed')setNotice('Sharing could not open. Download the image or use the caption links below.');}
 return <section className="duo-paper duo-keepsake" aria-label="Share my story"><p className="duo-eyebrow">A STORY WORTH KEEPING</p><h2>Take your side of the story with you.</h2><p>Your card includes your character name and your own outcomes. Your friend’s name, messages and private choices are left out; the second portrait is a generic illustration.</p>
 {preview?<img className="duo-keepsake-preview" src={preview} alt={`Preview of ${model.name}’s personal story card`} width={1080} height={1350}/>:<p role="status">{failed?'The image could not be prepared. Your text recap is still available.':'Preparing your image…'}</p>}
 <div className="duo-keepsake-actions"><button className="duo-primary" disabled={!card} onClick={()=>void share()}><Share2 size={17}/> Share image</button><button disabled={!card} onClick={download}><Download size={17}/> Download image</button><button onClick={()=>void copyCaption()}><Copy size={17}/> Copy caption</button></div>
 <p className="duo-small">On Threads, attach the saved image and paste your caption if the app does not carry both across.</p><SharePlatforms text={duoComposerText(payload)} url={payload.url} label="Share this story" />
 <details><summary>Read or select my caption</summary><textarea readOnly value={payload.text} aria-label="Story caption" onFocus={e=>e.target.select()}/></details>{notice&&<p role="status" className="duo-saved">{notice}</p>}</section>;
}
