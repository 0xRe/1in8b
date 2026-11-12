import {drawShareQr} from './share-qr';
import {birthInvitationUrl} from './social-sharing';
import {lifeShareUrl, signatureEvent} from './life-share';
import type { GameEvent, Life } from "../game/types";
import { countryName } from "../game/countries";
import type { Locale, translator } from "./i18n";
import { drawPixelScene, pixelScene, sceneSvg } from "./pixel-art";
import { portraitPaths } from "./portrait";
import { readJournal } from "./game-feedback";
import { FILM_EPILOGUE_START, FORMAT_SECONDS, selectedScenes, type FilmFormat, type FilmSettings } from "./film-model";
import { epilogueStory } from "./ending-story";
import { lifeGrain } from "./life-insights";
import { startFilmScore } from "./film-score";
import { viralCopy } from "./viral-copy";
type T=ReturnType<typeof translator>;
export class LifeMediaError extends Error {}
export const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));
export function mediaCanvas(width=1080,height=1350) {const c=document.createElement("canvas");c.width=width;c.height=height;return c;}
export function textLines(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,width:number,lineHeight:number,maxLines=8) {
  // Lines break between words where the script uses spaces; scripts without spaces, and words
  // wider than the line, break between characters. "\n" starts a new line.
  const fits=(value:string)=>ctx.measureText(value.trimEnd()).width<=width,out:string[]=[];
  for(const paragraph of text.split("\n")){
    let line="";
    for(const token of paragraph.match(/\S+\s*|\s+/g)??[""]){
      if(fits(line+token)){line+=token;continue;}
      // Thai and CJK runs may break anywhere, so they continue the current line.
      if(line.trim()&&!/[\u0e00-\u0e7f\u3040-\u30ff\u3400-\u9fff\uf900-\ufaff]/.test(token)){out.push(line);line="";if(fits(token)){line=token;continue;}}
      // Iterate Unicode code points so a break never splits a surrogate pair.
      for(const char of token){if(!fits(line+char)&&line.trim()){out.push(line);line="";}line+=char;}
    }
    out.push(line);
  }
  const shown=out.slice(0,maxLines);
  if(out.length>maxLines){
    const visible=Array.from(shown[maxLines-1].trimEnd());
    while(visible.length&&ctx.measureText(visible.join("")+"…").width>width)visible.pop();
    shown[maxLines-1]=visible.join("")+"…";
  }
  for(const line of shown){ctx.fillText(line.trim(),x,y);y+=lineHeight;}
  return y;
}
export function shareText(life:Life,locale:Locale,t:T,comment="") {
  const country=countryName(life.migration.birthCountry,locale);
  return [comment.trim().slice(0,300),`${life.name} · ${country}`,life.alive&&life.age===0?t("feature.birthShare",{year:life.birthYear}):life.alive?`${life.birthYear}—${life.year} · ${t("years",{n:life.age})}`:t("feature.lifeShare",{birth:life.birthYear,death:life.year,age:life.age}),!life.alive&&life.cause?`${t("cause")}: ${t(life.cause)}`:"",!life.alive?`${t("grain.title")}: ${t(lifeGrain(life).nameKey)}`:"",t("subtitle")].filter(Boolean).join("\n");
}
export function drawLifeCard(canvas:HTMLCanvasElement,life:Life,locale:Locale,t:T,comment="",event?:GameEvent,compactBody=false) {
  const ctx=canvas.getContext("2d")!,w=canvas.width,h=canvas.height,newborn=life.alive&&life.age===0;
  const serif='"Hahmlet", Georgia, serif',sans='"IBM Plex Sans", system-ui, sans-serif';
  const bg="#f4f1eb",paper="#fffdf8",ink="#172d43",muted="#5c6873",wine="#aa402d",line="#d9d6cd";
  // Warm archive paper matches the site identity and public social preview.
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  const glow=ctx.createRadialGradient?.(w*.5,h*.15,0,w*.5,h*.15,w);if(glow){glow.addColorStop(0,"rgba(255,255,255,.35)");glow.addColorStop(1,"rgba(255,255,255,0)");ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);}
  const m=w*.05,cw=w-m*2,ch=h-m*2;
  ctx.save();ctx.shadowColor="rgba(30,42,36,.18)";ctx.shadowBlur=w*.04;ctx.shadowOffsetY=w*.012;ctx.fillStyle=paper;roundedPath(ctx,m,m,cw,ch,w*.03);ctx.fill();ctx.restore();
  ctx.strokeStyle=line;ctx.lineWidth=2;roundedPath(ctx,m,m,cw,ch,w*.03);ctx.stroke();
  ctx.fillStyle=wine;ctx.fillRect(m+w*.06,m,cw-w*.12,6);
  const pad=m+w*.055,inner=cw-w*.11;
  ctx.textBaseline="alphabetic";
  ctx.fillStyle=wine;ctx.font=`600 ${Math.round(w*.022)}px ${sans}`;
  ctx.fillText(event?t("feature.cardMoment"):newborn?t("birthRegistration"):life.alive?t("feature.cardMoment"):t("feature.lifeRemembered"),pad,m+h*.06);
  // The photograph: the life's scene with a vignette, and the person's portrait set into its corner.
  const py=m+h*.09,ph=inner*180/320;
  // A finished life is shown at its happiest remembered moment, as in its link preview, not at the grave.
  drawMovingScene(ctx,pixelScene(life,event??(!life.alive?signatureEvent(life):undefined)),pad,py,inner,ph,.5,0);
  const ageNow=event?event.age:life.age,size=Math.round(w*.16/40)*40||80;
  const mx=pad+w*.03,my=py+ph-size*.62;
  ctx.fillStyle=paper;roundedPath(ctx,mx-8,my-8,size+16,size*1.2+16,w*.018);ctx.fill();ctx.strokeStyle=line;ctx.stroke();
  drawPortrait(ctx,{seed:life.seed,age:newborn&&!event?0:ageNow,sex:life.sex},mx,my,size);
  // Name, place and years, then the age in large numerals.
  let y=my+size*1.2+h*.06;
  const tx=mx+size+w*.05;
  ctx.fillStyle=ink;ctx.font=`500 ${Math.round(w*.058)}px ${serif}`;
  y=textLines(ctx,life.name,tx,py+ph+h*.06,pad+inner-tx,w*.064,2);
  ctx.fillStyle=muted;ctx.font=`${Math.round(w*.026)}px ${sans}`;
  ctx.fillText(`${countryName(life.migration.birthCountry,locale)} · ${event?event.year:newborn?life.birthYear:`${life.birthYear}—${life.year}`}`,tx,y+w*.006);
  y=Math.max(y+w*.06,my+size*1.2+h*.05);
  ctx.fillStyle=wine;ctx.font=`500 ${Math.round(w*.09)}px ${serif}`;
  const big=event?`${event.age}`:newborn?life.sex==="M"?t("male"):t("female"):`${life.age}`;
  ctx.fillText(big,pad,y+w*.07);
  const bigW=ctx.measureText(big).width;
  ctx.fillStyle=muted;ctx.font=`${Math.round(w*.026)}px ${sans}`;
  const unit=event||!newborn?t("years",{n:ageNow}).replace(String(ageNow),"").trim():t("bornIn",{country:countryName(life.migration.birthCountry,locale)});
  ctx.fillText(unit,pad+bigW+w*.02,y+w*.068);
  // A moment keeps its recorded caption alongside the player's explicitly entered words.
  const compact=compactBody||!!event;
  ctx.fillStyle=ink;ctx.font=`${Math.round(w*(compact ? .025 : .03))}px ${serif}`;
  // Stop above the footer rule: long causes or grain names otherwise run into the site line.
  const bodyY=y+w*.15,footerY=m+ch-h*.075,bodyLineHeight=w*(compact ? .036 : .044),bodyLines=Math.max(1,Math.min(compact?8:5,Math.floor((footerY-w*.035-bodyY)/bodyLineHeight)+1));
  textLines(ctx,(event?[comment,t(event.key,event.params)].filter(Boolean).join("\n"):comment)||(newborn?t("subtitle"):shareText(life,locale,t).split("\n").slice(2).join("\n")),pad,bodyY,inner-w*.18,bodyLineHeight,bodyLines);
  ctx.fillStyle=line;ctx.fillRect(pad,m+ch-h*.075,inner,1);
  ctx.fillStyle=muted;ctx.font=`500 ${Math.round(w*.02)}px ${sans}`;textLines(ctx,`1in8bn.com · ${t("feature.lifeAmong")}`,pad,m+ch-h*.04,inner-w*.18,w*.025,1);
  drawShareQr(ctx,lifeShareUrl(birthInvitationUrl(locale,life.migration.birthCountry.id),life),pad+inner-w*.14,m+ch-w*.14-w*.02,w*.14);
}
export function canvasBlob(canvas:HTMLCanvasElement):Promise<Blob>{return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("The image could not be created.")),"image/png"));}
export function downloadBlob(blob:Blob,name:string) {
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
export function albumDocument(life:Life,locale:Locale,t:T,settings:FilmSettings,albumSceneIds?:readonly string[]) {
  const ids=albumSceneIds?new Set(albumSceneIds):null;
  const scenes=ids?life.events.filter(event=>ids.has(event.id)).sort((a,b)=>a.age-b.age):selectedScenes(life,settings);
  const cards=scenes.map(e=>{
    const reflection=ids&&e.kind==="reflection"?life.reflections[String(e.age)]:"";
    return `<article>${sceneSvg(pixelScene(life,e))}<small>${escapeHtml(t("age"))} ${e.age} · ${e.year}</small><p>${escapeHtml(settings.captions[e.id]??t(e.key,e.params))}</p>${reflection?`<blockquote>${escapeHtml(reflection)}</blockquote>`:""}</article>`;
  }).join("");
  const face=(age:number)=>`<svg viewBox="0 0 40 48" shape-rendering="crispEdges" aria-hidden="true">${portraitPaths({seed:life.seed,age,sex:life.sex}).map(p=>`<path d="${p.d}" fill="${p.color}"/>`).join("")}</svg>`;
  const css=`html{overflow-x:hidden}:root{--paper:#f3eee2;--ink:#2a3a35;--muted:#6f7a72;--accent:#8b2944;--mount:#fffdf7}*{box-sizing:border-box}body{max-width:980px;padding:40px 32px 56px;margin:auto;color:var(--ink);font:17px/1.65 "Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;background:radial-gradient(120% 80% at 50% 0,#fbf8f0 0,var(--paper) 60%,#e7dfcd 100%) fixed}button{font:600 14px/1 system-ui,sans-serif;padding:11px 16px;background:var(--ink);color:#fff;border:0;border-radius:999px;cursor:pointer;display:block;margin:0 0 4px auto}.cover{text-align:center;padding:56px 24px 40px;margin:12px 0 44px;background:var(--mount);border:1px solid #e2d8c3;border-radius:6px;box-shadow:0 1px 0 #fff inset,0 18px 40px -24px #5b4a2c66;position:relative}.cover:before{content:"";position:absolute;inset:10px;border:1px solid #e9dfca;border-radius:3px;pointer-events:none}.brand{font:600 11px/1 system-ui,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--accent)}.faces{display:flex;align-items:center;justify-content:center;gap:18px;margin:28px 0 10px}.faces svg{width:92px;height:auto;image-rendering:pixelated;border-radius:50%;background:#efe6d3;box-shadow:0 0 0 4px var(--mount),0 0 0 5px #dccfb4}.faces span{color:#b9a98a;font-size:22px}h1{font-size:clamp(34px,6vw,54px);line-height:1.1;font-weight:400;margin:18px 0 8px;letter-spacing:-.01em}.who{color:var(--muted);margin:0}.words{font-style:italic;max-width:560px;margin:18px auto 0;white-space:pre-wrap}.rule{width:72px;height:1px;background:var(--accent);margin:26px auto 0;position:relative}.rule:after{content:"";position:absolute;left:50%;top:-3px;width:7px;height:7px;background:var(--accent);transform:translateX(-50%) rotate(45deg)}section{display:grid;grid-template-columns:1fr 1fr;gap:34px 28px;align-items:start}article{break-inside:avoid;margin:0;padding:12px 12px 18px;background:var(--mount);border-radius:3px;box-shadow:0 1px 2px #5b4a2c33,0 14px 28px -18px #5b4a2c80;position:relative}article:before,article:after{content:"";position:absolute;top:-9px;width:64px;height:20px;background:#efe3c3c4;box-shadow:0 1px 2px #5b4a2c22}article:before{left:-14px;transform:rotate(-28deg)}article:after{right:-14px;transform:rotate(28deg)}article:nth-child(odd){transform:rotate(-.6deg)}article:nth-child(even){transform:rotate(.5deg)}article svg{display:block;width:100%;height:auto;image-rendering:pixelated;border-radius:2px}small{display:block;font:600 11px/1 system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);margin:14px 4px 6px}article p{margin:0 4px;white-space:pre-wrap}blockquote{margin:12px 4px 0;padding-left:12px;border-left:2px solid #d9c9a8;font-style:italic;color:var(--muted)}footer{text-align:center;color:var(--muted);font-style:italic;margin-top:24px}@media(max-width:640px){body{padding:20px 14px 40px}section{grid-template-columns:1fr}.faces svg{width:72px}}@media print{body{background:#fff;padding:0;max-width:none}button{display:none}.cover{box-shadow:none;margin-top:0}article{box-shadow:none;border:1px solid #e2d8c3;transform:none}article:before,article:after{display:none}}@page{size:A4;margin:14mm}`;
  return `<!doctype html><html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(settings.title)} · ${escapeHtml(t("feature.lifeAlbum"))}</title><style>${css}</style></head><body><button onclick="window.print()">${escapeHtml(t("print"))}</button><header class="cover"><small class="brand">1in8bn.com · ${escapeHtml(t("feature.lifeAlbum"))}</small><div class="faces">${face(0)}${life.age>2?`<span>→</span>${face(life.age)}`:""}</div><h1>${escapeHtml(settings.title)}</h1><p class="who">${escapeHtml(life.name)} · ${life.birthYear}–${life.year}<br>${escapeHtml(countryName(life.migration.birthCountry,locale))}</p>${settings.words?`<p class="words">${escapeHtml(settings.words)}</p>`:""}<div class="rule"></div></header><section>${cards}</section><footer>${escapeHtml(t("feature.leavesSomething"))} · 1in8bn.com</footer></body></html>`;
}

const palettes={paper:["#edf0e7","#213c36","#8b2944"],sepia:["#e7d5b4","#493d31","#9b624b"],midnight:["#172c2b","#e0e6d8","#dfb79a"]};
/** Draws a portrait (40×48 pixel art) at whole-pixel scale onto a canvas. */
export function drawPortrait(ctx:CanvasRenderingContext2D,spec:{seed:number;age:number;sex:string},x:number,y:number,size:number) {
  const k=Math.max(1,Math.round(size/40));
  for(const p of portraitPaths(spec)){ctx.fillStyle=p.color;for(const m of p.d.matchAll(/M(\d+) (\d+)h(\d+)/g))ctx.fillRect(Math.round(x+Number(m[1])*k),Math.round(y+Number(m[2])*k),Number(m[3])*k,k);}
  return {w:40*k,h:48*k};
}
function roundedPath(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number) {
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
}
/** A scene with a slow push-in and drift (Ken Burns), clipped to a rounded frame. */
function drawMovingScene(ctx:CanvasRenderingContext2D,scene:ReturnType<typeof pixelScene>,x:number,y:number,w:number,h:number,local:number,drift:number,alpha=1) {
  ctx.save();ctx.globalAlpha=alpha;roundedPath(ctx,x,y,w,h,Math.round(w*.025));ctx.clip();
  // Cover the frame (taller frames crop the wide scene) and pan across it slowly.
  const baseW=Math.max(w,h*320/180),zoom=1.03+.06*local,sw=baseW*zoom,sh=sw*180/320;
  drawPixelScene(ctx,scene,x-(sw-w)/2+drift*(sw-w)*.42*(local-.5),y-(sh-h)*(.7-.25*local),sw,sh);
  const g=ctx.createRadialGradient?.(x+w/2,y+h/2,h*.35,x+w/2,y+h/2,w*.75);if(g){g.addColorStop(0,"rgba(0,0,0,0)");g.addColorStop(1,"rgba(10,16,14,.32)");ctx.fillStyle=g;ctx.fillRect(x,y,w,h);}
  ctx.restore();
}
const ease=(v:number)=>v<=0?0:v>=1?1:v*v*(3-2*v);
export function drawFilmFrame(canvas:HTMLCanvasElement,life:Life,t:T,settings:FilmSettings,format:FilmFormat,seconds:number,locale:Locale="en") {
  const ctx=canvas.getContext("2d")!,w=canvas.width,h=canvas.height,duration=FORMAT_SECONDS[format];
  const scenes=selectedScenes(life,settings),count=Math.max(1,scenes.length);
  const elapsed=Math.max(0,Math.min(duration,Number.isFinite(seconds)?seconds:0));
  const epilogue=format==="epilogue"||(format==="film"&&elapsed>=FILM_EPILOGUE_START);
  const chapterSeconds=epilogue&&format==="film"?elapsed-FILM_EPILOGUE_START:elapsed;
  const chapterDuration=epilogue?FORMAT_SECONDS.epilogue:format==="film"?FILM_EPILOGUE_START:duration;
  const progress=elapsed/duration,chapterProgress=Math.min(.999999,chapterSeconds/chapterDuration);
  const intro=!epilogue&&chapterProgress<.08,outro=!epilogue&&chapterProgress>.92;
  const slot=Math.max(0,chapterProgress-.08)/.84*count,index=Math.min(count-1,Math.floor(slot)),local=Math.min(1,slot-index),event=scenes[index];
  const [bg,ink,accent]=palettes[settings.mood];
  const serif='"Hahmlet", Georgia, serif',sans='"IBM Plex Sans", system-ui, sans-serif';
  // Paper background with a soft light from above.
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  const glow=ctx.createRadialGradient?.(w/2,h*.18,0,w/2,h*.18,w*.9);if(glow){glow.addColorStop(0,"rgba(255,255,255,.18)");glow.addColorStop(1,"rgba(255,255,255,0)");ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);}
  ctx.textBaseline="alphabetic";
  ctx.fillStyle=accent;ctx.font=`600 ${Math.round(w*.022)}px ${sans}`;ctx.fillText(`1in8bn · ${t("feature.oneLife")}`,w*.08,h*.065);
  const after=epilogue?epilogueStory(life,t):null;
  const fade=(v:number)=>ease(Math.min(1,v/.18));
  if(intro||outro){
    // Title cards: the person at the start or end of life, framed like a keepsake.
    const card=intro?chapterProgress/.08:(chapterProgress-.92)/.08,a=ease(Math.min(1,card*2.2));
    ctx.save();ctx.globalAlpha=a;
    const size=Math.round(w*.34),px=(w-size*40/40)/2,py=h*.2;
    ctx.fillStyle="rgba(255,255,255,.35)";roundedPath(ctx,px-18,py-18,size+36,size*1.2+36,28);ctx.fill();
    const drawn=drawPortrait(ctx,{seed:life.seed,age:intro?0:life.age,sex:life.sex},px,py,size);
    ctx.textAlign="center";ctx.fillStyle=ink;ctx.font=`500 ${Math.round(w*.072)}px ${serif}`;
    const ty=py+drawn.h+h*.08;textLines(ctx,intro?settings.title||life.name:t("feature.lifeRemembered"),w/2,ty,w*.84,w*.08,2);
    ctx.font=`${Math.round(w*.034)}px ${sans}`;ctx.globalAlpha=a*.8;
    textLines(ctx,intro?`${countryName(life.migration.birthCountry,locale)} · ${life.birthYear}—${life.year}`:settings.words||t("feature.leavesSomething"),w/2,ty+w*.1,w*.8,w*.05,4);
    ctx.textAlign="left";ctx.restore();
  } else {
    const epilogueEvent=after?{id:"epilogue",age:after.age,year:life.birthYear+after.age,key:"",params:{},kind:"everyday" as const,icon:""}:undefined;
    const portrait=h>w*1.2,sx=w*.07,sy=h*(portrait?.2:.24),swid=w*.86,shgt=portrait?Math.min(h*.5,swid*1.08):swid*180/320;
    const scene=pixelScene(life,epilogue?epilogueEvent:event,after?.scene,chapterSeconds);
    if(!epilogue&&index>0&&local<.14){const prev=scenes[index-1];drawMovingScene(ctx,pixelScene(life,prev,undefined,chapterSeconds),sx,sy,swid,shgt,1,index%2?1:-1);}
    drawMovingScene(ctx,scene,sx,sy,swid,shgt,epilogue?chapterProgress:local,index%2?-1:1,epilogue?1:ease(Math.min(1,local/.14)));
    // Age as the chapter heading, caption fading in under the picture.
    const a=epilogue?1:fade(local);
    ctx.save();ctx.globalAlpha=a;ctx.fillStyle=ink;
    ctx.font=`500 ${Math.round(w*.06)}px ${serif}`;
    textLines(ctx,epilogue?after!.title:`${t("age")} ${event?.age??life.age}`,w*.08,sy-h*.03,w*.84,w*.07,1);
    ctx.font=`${Math.round(w*.038)}px ${sans}`;
    const lines=after?.lines??[],line=Math.max(0,Math.min(2,Math.floor((chapterProgress-.08)/.92*3)));
    const chosen=event?.key==="event.decision"&&typeof localStorage!=="undefined"?readJournal(life.id).find((entry)=>entry.eventId===event.id):undefined;
    const caption=epilogue?lines[line]??"":event?settings.captions[event.id]??(chosen?`${t("feel.youChose")}: ${t(chosen.choiceKey,chosen.choiceParams)}`:t(event.key,event.params)):"";
    textLines(ctx,caption,w*.08,sy+shgt+h*.065,w*.84,w*.056,4);
    ctx.restore();
  }
  // The last seconds of every format invite the viewer to play: the question, then the address.
  const cta=Math.min(1,Math.max(0,(elapsed-(duration-3.2))/.8));
  if(cta>0){
    ctx.save();ctx.globalAlpha=cta*.94;ctx.fillStyle=bg;roundedPath(ctx,w*.06,h*.765,w*.88,h*.125,w*.03);ctx.fill();
    ctx.globalAlpha=cta;ctx.textAlign="center";ctx.fillStyle=ink;ctx.font=`500 ${Math.round(w*.05)}px ${serif}`;
    textLines(ctx,viralCopy(locale).postChallenge,w/2,h*.815,w*.8,w*.055,1);
    ctx.fillStyle=accent;ctx.font=`700 ${Math.round(w*.056)}px ${sans}`;ctx.fillText("1in8bn.com",w/2,h*.87);
    ctx.restore();
  }
  // Story-style progress: one segment per memory.
  ctx.fillStyle=accent;ctx.font=`600 ${Math.round(w*.02)}px ${sans}`;ctx.fillText("1in8bn.com",w*.08,h*.915);
  const segs=Math.max(1,format==="film"?count+1:count),gap=w*.008,segW=(w*.84-gap*(segs-1))/segs;
  for(let i=0;i<segs;i++){const x=w*.08+i*(segW+gap),fill=Math.max(0,Math.min(1,progress*segs-i));ctx.globalAlpha=.25;ctx.fillRect(x,h*.94,segW,4);ctx.globalAlpha=1;ctx.fillRect(x,h*.94,segW*fill,4);}
}
function recordingInterruption(signal:AbortSignal,t?:T):Error|undefined {
  if(signal.aborted)return new DOMException("Cancelled","AbortError");
  if(document.hidden)return new LifeMediaError(t?.("feature.hiddenRecording")??"Recording stopped because the tab was hidden. Keep this tab visible and try again.");
}

/** resume() can wait indefinitely for permission; cancellation must still finish. */
function resumeAudio(audio:AudioContext,signal:AbortSignal,t:T):Promise<void> {
  return new Promise((resolve,reject)=>{
    let settled=false;
    const clean=()=>{
      signal.removeEventListener("abort",interrupted);
      document.removeEventListener("visibilitychange",interrupted);
    };
    const finish=(error?:unknown)=>{
      if(settled)return;
      settled=true;clean();
      if(error)reject(error);else resolve();
    };
    const interrupted=()=>{const error=recordingInterruption(signal,t);if(error)finish(error);};
    signal.addEventListener("abort",interrupted,{once:true});
    document.addEventListener("visibilitychange",interrupted);
    interrupted();
    if(!settled) {
      try{audio.resume().then(()=>finish(recordingInterruption(signal,t)),finish);}
      catch(error){finish(error);}
    }
  });
}

/** User-initiated real-time recording. Tracks and audio are always released. */
export async function recordLifeFilm(life:Life,t:T,settings:FilmSettings,format:FilmFormat,onProgress:(n:number)=>void,signal:AbortSignal,locale:Locale="en"):Promise<Blob> {
  if(!globalThis.MediaRecorder)throw new LifeMediaError(t("feature.noRecorder"));
  const mime=["video/mp4;codecs=avc1.424028,mp4a.40.2","video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"].find(m=>MediaRecorder.isTypeSupported(m));
  if(!mime)throw new LifeMediaError(t("feature.noVideoFormat"));
  const canvas=mediaCanvas(720,1280),stream=canvas.captureStream(24),chunks:BlobPart[]=[];
  let audio:AudioContext|undefined, timer:ReturnType<typeof setInterval>|undefined, recorder:MediaRecorder|undefined;
  let stopScore:(()=>void)|undefined;
  try {
    const interruption=recordingInterruption(signal,t);if(interruption)throw interruption;
    if(settings.music!=="silent") {
      audio=new AudioContext();await resumeAudio(audio,signal,t);
      const interruption=recordingInterruption(signal,t);if(interruption)throw interruption;
      if(audio.state!=="running")throw new LifeMediaError(t("feature.audioStartError"));
      const dest=audio.createMediaStreamDestination(),gain=audio.createGain();gain.gain.value=.9;gain.connect(dest);
      stream.addTrack(dest.stream.getAudioTracks()[0]);
      stopScore=startFilmScore(audio,gain,settings.music,life.seed,FORMAT_SECONDS[format]+.5);
    }
    const beforeRecording=recordingInterruption(signal,t);if(beforeRecording)throw beforeRecording;
    const rec=recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:3_000_000});
    const duration=FORMAT_SECONDS[format]*1000;
    return await new Promise<Blob>((resolve,reject)=>{
      let settled=false;
      const clean=()=>{signal.removeEventListener("abort",abort);document.removeEventListener("visibilitychange",visibility);if(timer)clearInterval(timer);};
      const fail=(error:Error)=>{if(settled)return;settled=true;clean();try{if(rec.state!=="inactive")rec.stop();}catch{/* Preserve the original failure even if the recorder cannot stop. */}reject(error);};
      const abort=()=>fail(new DOMException("Cancelled","AbortError"));
      const visibility=()=>{if(document.hidden)fail(new LifeMediaError(t?.("feature.hiddenRecording")??"Recording stopped because the tab was hidden. Keep this tab visible and try again."));};
      signal.addEventListener("abort",abort,{once:true});document.addEventListener("visibilitychange",visibility);
      rec.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
      rec.onerror=()=>fail(new LifeMediaError(t("feature.recordFailed")));
      rec.onstop=()=>{if(settled)return;if(!chunks.length){fail(new LifeMediaError(t("feature.recordFailed")));return;}settled=true;clean();resolve(new Blob(chunks,{type:mime}));};
      const interruption=recordingInterruption(signal,t);if(interruption){fail(interruption);return;}
      try {
        drawFilmFrame(canvas,life,t,settings,format,0,locale);rec.start(1000);const start=performance.now();
        timer=setInterval(()=>{
          try {
            const elapsed=performance.now()-start;
            drawFilmFrame(canvas,life,t,settings,format,Math.min(elapsed,duration)/1000,locale);
            onProgress(Math.min(1,elapsed/duration));
            if(elapsed>=duration&&rec.state!=="inactive"){if(timer)clearInterval(timer);rec.stop();}
          } catch { fail(new LifeMediaError(t("feature.recordFailed"))); }
        },1000/24);
      } catch { fail(new LifeMediaError(t("feature.recordFailed"))); }
    });
  } finally {
    if(timer)clearInterval(timer);stopScore?.();
    try{if(recorder&&recorder.state!=="inactive")recorder.stop();}catch{/* Track and audio cleanup must still run after a recorder failure. */}
    stream.getTracks().forEach(track=>track.stop());
    // Initiate release immediately, without making cancellation wait for a browser audio promise.
    if(audio&&audio.state!=="closed")void audio.close().catch(()=>{});
  }
}
