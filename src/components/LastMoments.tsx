import "./birth-experience.css";
import { useEffect, useState } from "react";
import { Share2 } from "lucide-react";
import type { Life } from "../game/types";
import type { Locale, translator } from "../lib/i18n";
import { canvasBlob, drawLifeCard, mediaCanvas } from "../lib/life-media";
import { defaultScenes } from "../lib/film-model";
import { pixelScene, sceneDataUrl } from "../lib/pixel-art";

import { endingSummary } from "../lib/ending-story";

export function LastMoments({life,t,locale,onDone,onShare,onAgain}:{life:Life;t:ReturnType<typeof translator>;locale?:Locale;onDone:()=>void;onShare?:()=>void;onAgain?:()=>void}) {
  const memories=defaultScenes(life).filter(e=>e.kind!=="death"&&e.key!=="event.choice").slice(-6);
  const [step,setStep]=useState(0),event=memories[step-1];
  const last=step>memories.length,summary=endingSummary(life);
  const [autoplay,setAutoplay]=useState(false);
  // The closing frame shows the card the player would share, not the grave: seeing it invites sending it.
  const [card,setCard]=useState(""),shareable=!!onShare;
  useEffect(()=>{
    if(!last||!shareable||!locale)return;
    let active=true,url="";
    void document.fonts?.ready.then(async()=>{const c=mediaCanvas(1080,1350);drawLifeCard(c,life,locale,t);const blob=await canvasBlob(c);if(active){url=URL.createObjectURL(blob);setCard(url);}}).catch(()=>{});
    return()=>{active=false;if(url)URL.revokeObjectURL(url);setCard("");};
  },[last,shareable,locale,life,t]);
  useEffect(()=>{
    if(!autoplay||last)return;
    const stop=()=>{if(document.hidden)setAutoplay(false);};document.addEventListener("visibilitychange",stop);
    const timer=setTimeout(()=>setStep(s=>s+1),6500);
    return()=>{clearTimeout(timer);document.removeEventListener("visibilitychange",stop);};
  },[autoplay,last,step]);
  return <section className="last-moments">
    <p className="eyebrow">{step===0?t("feature.lastYear"):last?t("ending"):t("feature.daysBehind")}</p>
    <h2>{last?life.name:step===0?`${t("age")} ${life.age}`:`${t("age")} ${event?.age}`}</h2>
    {last&&card?<img className="last-moments-card" src={card} width={1080} height={1350} alt={t("feature.cardAlt",{name:life.name})}/>:<img key={step} className="last-moments-scene" src={sceneDataUrl(pixelScene(life,event,step===0||last?"memorial":undefined))} alt={last?t("feature.gardenAlt"):step===0?t("feature.lastMoments"):t("feature.memoryAge",{age:event?.age??life.age})}/>}
    <p className="last-caption">{step===0?t("feature.lifeEnded",{name:life.name,causeLabel:t("cause"),cause:t(life.cause??"cause.age")}):last?t("feature.momentsRemain"):t(event.key,event.params)}</p>
    {last&&<><p className="ending-days">{t("family.ending",{days:summary.days.toLocaleString(),children:summary.children,grandchildren:summary.grandchildren,survivors:summary.survivors})}</p>{summary.reflection&&<blockquote><small>{t("feature.privateThought",{age:summary.reflectionAge??0})}</small><p>{summary.reflection}</p></blockquote>}</>}
    <div className="actions">{last&&onAgain?<button className="secondary" onClick={onAgain}>{t("again")}</button>:<button className="secondary" aria-pressed={autoplay} onClick={()=>setAutoplay(v=>!v)} disabled={last}>{autoplay?t("feature.pauseMemories"):t("feature.playMemories")}</button>}<button className={last&&onShare?"secondary":"primary"} onClick={()=>last?onDone():setStep(s=>s+1)}>{last?t("feature.seeRecord"):t("continue")}</button>{last&&onShare?<button className="primary last-moments-share" onClick={onShare}><Share2 size={16} aria-hidden="true"/>{t("feature.shareFriends")}</button>:<button className="secondary" onClick={()=>{
      // Skipping the memories of one's own finished life lands on the closing card (share, be born
      // again, see the record) instead of closing: phone players skipped straight past sharing.

      if(shareable)setStep(memories.length+1);else onDone();
    }}>{t("feature.skip")}</button>}<span className="muted last-moments-count">{step+1} / {memories.length+2}</span></div>
  </section>;
}
