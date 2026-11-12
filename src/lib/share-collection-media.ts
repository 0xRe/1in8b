import type {Life} from '../game/types';
import {countryName} from '../game/countries';
import type {Locale,translator} from './i18n';
import {drawPortrait,textLines} from './life-media';
import {lifeGrain} from './life-insights';
import {beginningFacts} from './share-collection';
import {collectionCopy} from './share-collection-copy';
import {drawShareQr} from './share-qr';
type T=ReturnType<typeof translator>;
const ink='#172d43',muted='#5c6873',accent='#aa402d',teal='#245e78',line='#d9d6cd';
const sans='"IBM Plex Sans",sans-serif',serif='"Hahmlet",Georgia,serif';
function frame(canvas:HTMLCanvasElement){
 const c=canvas.getContext('2d');if(!c)throw Error('Canvas unavailable');const w=canvas.width,h=canvas.height;
 c.fillStyle='#f4f1eb';c.fillRect(0,0,w,h);c.fillStyle='#fffdf8';c.fillRect(w*.04,w*.04,w*.92,h-w*.08);c.fillStyle=accent;c.fillRect(w*.04,w*.04,w*.92,7);
 c.textBaseline='alphabetic';c.textAlign='left';c.fillStyle=teal;c.font=`600 ${w*.023}px ${sans}`;c.fillText('1in8bn.com',w*.085,w*.105);return {c,w,h};
}
function footer(c:CanvasRenderingContext2D,w:number,h:number,t:T,url:string){
 c.strokeStyle=line;c.beginPath();c.moveTo(w*.085,h-w*.13);c.lineTo(w*.73,h-w*.13);c.stroke();c.fillStyle=teal;c.font=`600 ${w*.024}px ${sans}`;c.fillText('1in8bn.com',w*.085,h-w*.075);
 c.fillStyle=muted;c.font=`${w*.017}px ${sans}`;textLines(c,t('feature.lifeAmong'),w*.085,h-w*.045,w*.58,w*.022,1);drawShareQr(c,url,w*.78,h-w*.20,w*.14);
}
/** A retrospective beginning card uses immutable identity only, without replaying or fabricating a birth state. */
export function drawBeginningCard(canvas:HTMLCanvasElement,life:Life,locale:Locale,t:T,url:string){
 const {c,w,h}=frame(canvas),facts=beginningFacts(life),copy=collectionCopy(locale);
 c.fillStyle=ink;c.font=`500 ${w*.055}px ${serif}`;textLines(c,copy.beginning,w*.085,h*.17,w*.83,w*.065,2);
 const size=Math.round(w*.28/40)*40;drawPortrait(c,{seed:facts.seed,age:0,sex:facts.sex},(w-size)/2,h*.24,size);
 c.textAlign='center';c.fillStyle=ink;c.font=`500 ${w*.065}px ${serif}`;textLines(c,facts.name,w/2,h*.64,w*.82,w*.075,2);
 c.fillStyle=teal;c.font=`600 ${w*.034}px ${sans}`;textLines(c,countryName(facts.country,locale),w/2,h*.765,w*.8,w*.042,1);
 c.fillStyle=muted;c.font=`${w*.028}px ${sans}`;c.fillText(`${facts.birthYear} · ${t(facts.sex==='F'?'female':'male')}`,w/2,h*.815);c.textAlign='left';
 c.font=`${w*.019}px ${sans}`;textLines(c,copy.birthNote,w*.085,h*.865,w*.62,w*.026,2);footer(c,w,h,t,url);
}
/** Equal visual weight for each selected life, with no winning score or monetary ranking. */
export function drawComparisonCard(canvas:HTMLCanvasElement,lives:readonly Life[],locale:Locale,t:T,url:string,comment=''){
 if(lives.length<2||lives.length>4)throw Error('Choose 2–4 lives');
 const {c,w,h}=frame(canvas),copy=collectionCopy(locale);
 c.fillStyle=ink;c.font=`500 ${w*.046}px ${serif}`;textLines(c,copy.comparisonTitle,w*.085,h*.15,w*.83,w*.057,2);
 c.fillStyle=muted;c.font=`${w*.024}px ${sans}`;textLines(c,comment.trim().slice(0,160),w*.085,h*.23,w*.83,w*.032,2);
 const start=h*.30,rowHeight=(h*.86-start)/lives.length;
 lives.forEach((life,index)=>{
  const spacious=lives.length===2,y=start+index*rowHeight,size=Math.min(spacious?200:lives.length===3?160:120,Math.floor((rowHeight-50)/48)*40),x=w*.085,tx=x+size+w*.04,tw=w*.83-size-w*.04;
  c.strokeStyle=line;c.beginPath();c.moveTo(x,y);c.lineTo(w*.915,y);c.stroke();
  drawPortrait(c,{seed:life.seed,age:life.age,sex:life.sex},x,y+25,size);
  c.fillStyle=ink;c.font=`600 ${w*(spacious ? .043 : .034)}px ${sans}`;textLines(c,life.name,tx,y+(spacious?rowHeight*.19:w*.043),tw,w*.049,1);
  c.fillStyle=teal;c.font=`${w*(spacious ? .032 : .026)}px ${sans}`;textLines(c,`${countryName(beginningFacts(life).country,locale)} · ${t('years',{n:life.age})}`,tx,y+(spacious?rowHeight*.33:w*.082),tw,w*.04,1);
  c.fillStyle=muted;c.font=`${w*(spacious ? .026 : .021)}px ${sans}`;c.fillText(`${life.birthYear}—${life.year}`,tx,y+(spacious?rowHeight*.43:w*.115));
  const grain=lifeGrain(life);c.font=`${w*(spacious ? .030 : .021)}px ${sans}`;textLines(c,t(grain.nameKey),tx,y+(spacious?rowHeight*.56:w*.148),tw,w*.035,1);
  c.font=`${w*(spacious ? .023 : .018)}px ${sans}`;textLines(c,`${t('children')}: ${life.family.children.length} · ${t('family.grandchildren')}: ${life.descendants.grandchildren.length}`,tx,y+(spacious?rowHeight*.68:w*.171),tw,w*.03,1);
 });
 footer(c,w,h,t,url);
}
