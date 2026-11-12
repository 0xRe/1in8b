import {drawShareQr} from './share-qr';
import {birthInvitationUrl} from './social-sharing';
import type { Life } from '../game/types';
import { countryName, countryProbability } from '../game/countries';
import { lifeTable } from '../game/engine';
import type { Locale, translator } from './i18n';
import { birthCopy, fillBirthCopy } from './birth-experience-copy';
import { textLines } from './life-media';
import { drawPixelScene, pixelScene } from './pixel-art';
export function birthCardFacts(life:Life,locale:Locale) {
 const country=life.migration?.birthCountry??life.country;
 return {country,name:countryName(country,locale),birthPercent:countryProbability(country,life.settings.weightMode)*100,underFivePercent:country.u5/10,expectancy:lifeTable(country,life.sex).expectancy};
}
export function drawBirthShareCard(canvas:HTMLCanvasElement,life:Life,locale:Locale,t:ReturnType<typeof translator>,comment='') {
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');
 const w=canvas.width,h=canvas.height,m=w*.06,f=birthCardFacts(life,locale),copy=birthCopy(locale);
 const percent=(value:number)=>new Intl.NumberFormat(locale==='zh'?'zh-Hant':locale,{maximumFractionDigits:2}).format(value)+'%';
 ctx.fillStyle='#f4f1eb';ctx.fillRect(0,0,w,h);ctx.fillStyle='#aa402d';ctx.fillRect(0,0,w,h*.075);
 ctx.fillStyle='#ffffff';ctx.font=`600 ${w*.029}px "IBM Plex Sans",sans-serif`;ctx.fillText('1 in 8 Billion',m,h*.047);ctx.textAlign='right';ctx.font=`${w*.017}px monospace`;ctx.fillText(`${f.country.id}—${life.birthYear}`,w-m,h*.047);ctx.textAlign='left';
 ctx.fillStyle='#245e78';ctx.font=`${w*.022}px "IBM Plex Sans",sans-serif`;ctx.fillText(`${copy.certificate} · ${life.birthYear}`,m,h*.115);
 ctx.fillStyle='#172d43';ctx.font=`600 ${w*.085}px "IBM Plex Sans",sans-serif`;textLines(ctx,f.name,m,h*.19,w-2*m,w*.092,2);
 ctx.fillStyle='#5c6873';ctx.font=`${w*.027}px "IBM Plex Sans",sans-serif`;textLines(ctx,comment.trim().slice(0,160)||fillBirthCopy(copy.born,{country:f.name}),m,h*.275,w-2*m,w*.038,2);
 const birth={...life,age:0,alive:true};drawPixelScene(ctx,pixelScene(birth,undefined,'nursery'),m,h*.36,w*.30,w*.30*180/320);
 const x=w*.40;ctx.fillStyle='#172d43';ctx.font=`600 ${w*.037}px "IBM Plex Sans",sans-serif`;let y=textLines(ctx,life.name,x,h*.385,w-x-m,w*.043,2)+w*.01;
 ctx.font=`${w*.021}px "IBM Plex Sans",sans-serif`;ctx.fillStyle='#5c6873';const parents=life.family.parents.map(p=>`${t(p.sex==='F'?'mother':'father')}, ${Math.max(0,life.birthYear-p.birthYear)}`).join(' · ');
 y=textLines(ctx,parents,x,y,w-x-m,w*.031,2);y=textLines(ctx,`${t('siblings')}: ${life.family.siblings.filter(p=>p.birthYear<life.birthYear).length} · ${t(`religion.${life.stats.religion}`)}`,x,y,w-x-m,w*.031,2);textLines(ctx,fillBirthCopy(copy.income,{n:life.stats.incomeQuintile}),x,y,w-x-m,w*.031,2);
 const gap=w*.018,tile=(w-2*m-2*gap)/3;
 const metrics=[[percent(f.birthPercent),copy.odds],[percent(f.underFivePercent),t('underFive')],[t('years',{n:f.expectancy.toFixed(1)}),t('lifeExpectancy')]];
 metrics.forEach(([value,label],i)=>{const tx=m+i*(tile+gap);ctx.fillStyle='#fffdf8';ctx.fillRect(tx,h*.58,tile,h*.155);ctx.strokeStyle='#d9d6cd';ctx.lineWidth=2;ctx.strokeRect(tx,h*.58,tile,h*.155);ctx.fillStyle=i===1?'#aa402d':'#245e78';ctx.font=`600 ${w*.043}px "IBM Plex Sans",sans-serif`;while(ctx.measureText(value).width>tile-w*.04){const size=Number(ctx.font.match(/[\d.]+(?=px)/)?.[0]??20);if(size<=20)break;ctx.font=`600 ${size-1}px "IBM Plex Sans",sans-serif`;}ctx.fillText(value,tx+w*.02,h*.635);ctx.fillStyle='#5c6873';ctx.font=`${w*.020}px "IBM Plex Sans",sans-serif`;textLines(ctx,label,tx+w*.02,h*.67,tile-w*.04,w*.026,3);});
 ctx.fillStyle='#172d43';ctx.font=`600 ${w*.023}px "IBM Plex Sans",sans-serif`;ctx.fillText(copy.companions,m,h*.79);ctx.font=`${w*.022}px "IBM Plex Sans",sans-serif`;const companions=life.companions.map(c=>countryName(c.country,locale)).join(' · ');textLines(ctx,companions,m,h*.822,w-2*m,w*.031,2);
 ctx.strokeStyle='#d9d6cd';ctx.beginPath();ctx.moveTo(m,h*.885);ctx.lineTo(w-m,h*.885);ctx.stroke();ctx.fillStyle='#245e78';ctx.font=`600 ${w*.026}px "IBM Plex Sans",sans-serif`;textLines(ctx,copy.challenge,m,h*.922,w-2*m-w*.17,w*.034,1);ctx.fillStyle='#aa402d';ctx.font=`600 ${w*.024}px monospace`;ctx.fillText('1in8bn.com',m,h*.97);drawShareQr(ctx,birthInvitationUrl(locale,f.country.id),w-m-w*.14,h-w*.16,w*.14);
}
