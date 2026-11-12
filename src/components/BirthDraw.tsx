import './birth-experience.css';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import { BIRTH_PREVIEW_TIMES, previewCountry } from '../lib/birth-journey';
import { birthCopy } from '../lib/birth-experience-copy';
import { countryName, countryProbability } from '../game/countries';
import type { Country, WeightMode } from '../game/types';
import type { Locale } from '../lib/i18n';
import { WorldMap } from './Visuals';

export function BirthDraw({locale,weight,onSelect,onDone}:{locale:Locale;weight:WeightMode;onSelect:()=>Country;onDone:()=>void}) {
 const copy=birthCopy(locale),[country,setCountry]=useState(()=>previewCountry(weight,Math.random())),[settled,setSettled]=useState(false),[failed,setFailed]=useState(false);
 const refs=useRef({onSelect,onDone});refs.current={onSelect,onDone};
 const timer=useRef<ReturnType<typeof setTimeout>|null>(null),chosen=useRef(false),finished=useRef(false),region=useRef<HTMLElement>(null);
 const complete=()=>{if(finished.current)return;finished.current=true;refs.current.onDone();};
 const choose=(skip:boolean)=>{
  if(timer.current)clearTimeout(timer.current);
  if(chosen.current){if(skip)complete();return;}
  try{const next=refs.current.onSelect();chosen.current=true;setCountry(next);setSettled(true);if(skip)complete();else timer.current=setTimeout(complete,800);}
  catch{setFailed(true);}
 };
 const actions=useRef({choose});actions.current={choose};
 useEffect(()=>{
  region.current?.focus();
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const reduce=()=>{if(media.matches)actions.current.choose(true);};
  media.addEventListener('change',reduce);
  if(media.matches)actions.current.choose(true);
  else{
   const start=performance.now();let index=1;
   const tick=()=>{if(index>=BIRTH_PREVIEW_TIMES.length){actions.current.choose(false);return;}setCountry(previewCountry(weight,Math.random()));index++;if(index>=BIRTH_PREVIEW_TIMES.length){actions.current.choose(false);return;}timer.current=setTimeout(tick,Math.max(0,BIRTH_PREVIEW_TIMES[index]-(performance.now()-start)));};
   timer.current=setTimeout(tick,BIRTH_PREVIEW_TIMES[1]);
  }
  return()=>{if(timer.current)clearTimeout(timer.current);media.removeEventListener('change',reduce);};
 },[weight]);
 const name=countryName(country,locale),odds=new Intl.NumberFormat(locale==='zh'?'zh-Hant':locale,{style:'percent',maximumFractionDigits:2}).format(countryProbability(country,weight));
 return <main ref={region} tabIndex={-1} className={`birth-draw ${settled?'birth-draw--settled':''}`} aria-label={copy.choosing} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();choose(true);}}}>
   <p className="birth-draw-brand">1 <span>in 8 Billion</span></p>
   <div className="birth-draw-map" aria-hidden="true"><WorldMap players={[{country:country.id,count:1}]}/></div>
   <div className="birth-draw-copy">
     <p className="eyebrow" role="status">{settled?copy.selected:copy.choosing}</p>
     <div className="birth-draw-country" aria-hidden="true"><span className="birth-draw-flag">{country.flag}</span><h1 key={country.id}>{name}</h1></div>
     <p className="birth-draw-odds" aria-hidden="true">{copy.odds} <strong>{odds}</strong></p>
     <span className="sr-only" aria-live="polite">{settled?`${name}. ${copy.odds}: ${odds}`:''}</span>
     <div className="birth-draw-progress" aria-hidden="true"><i/></div>
     <p className="birth-draw-wait">{copy.waiting}</p>
   </div>
   <button className="birth-draw-skip" onClick={()=>choose(true)}>{copy.skip}{settled?<Check size={16}/>:<ArrowRight size={16}/>}</button>
   {failed&&<p role="alert"><button onClick={()=>choose(true)}>{copy.skip}</button></p>}
 </main>;
}
