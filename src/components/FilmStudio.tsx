import "./birth-experience.css";
import { useEffect, useRef, useState } from "react";
import { Download, Play, Share2, Square, X } from "lucide-react";
import type { Life } from "../game/types";
import type { Locale, translator } from "../lib/i18n";
import { FILM_EPILOGUE_START, FILM_MOODS, FORMAT_SECONDS, loadFilmSettings, MUSIC_TRACKS, saveFilmSettings, selectedScenes, type FilmFormat, type FilmSettings } from "../lib/film-model";
import { albumDocument, LifeMediaError, canvasBlob, downloadBlob, drawFilmFrame, drawLifeCard, mediaCanvas, recordLifeFilm } from "../lib/life-media";
import { pixelScene, sceneDataUrl } from "../lib/pixel-art";
import { startFilmScore } from "../lib/film-score";
import { lifeShareUrl } from "../lib/life-share";
import { birthInvitationUrl, shareImageAction } from "../lib/social-sharing";
import { lifePost, viralCopy } from "../lib/viral-copy";

export function FilmStudio({life,locale,t}:{life:Life;locale:Locale;t:ReturnType<typeof translator>}) {
  const [settings,setSettings]=useState<FilmSettings>(()=>loadFilmSettings(life)),[tab,setTab]=useState("Scenes"),[format,setFormat]=useState<FilmFormat>("teaser");
  const [playing,setPlaying]=useState(false),[seconds,setSeconds]=useState(0),[progress,setProgress]=useState<number|null>(null),[status,setStatus]=useState("");
  const canvas=useRef<HTMLCanvasElement>(null),abort=useRef<AbortController|null>(null),alive=useRef(true),[savedVideo,setSavedVideo]=useState<{blob:Blob;url:string;format:FilmFormat}|null>(null);
  const selected=selectedScenes(life,settings),duration=FORMAT_SECONDS[format];
  // Players watch the whole preview but rarely sit through a second real-time recording, so a preview
  // from the start also records quietly in the background; the video is ready when the preview ends.
  const quiet=useRef<AbortController|null>(null);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;abort.current?.abort();quiet.current?.abort();};},[]);
  useEffect(()=>()=>{if(savedVideo)URL.revokeObjectURL(savedVideo.url);},[savedVideo]);
  useEffect(()=>{quiet.current?.abort();setSavedVideo(null);setStatus("");},[life,locale,settings,format,t]);
  useEffect(()=>{try{saveFilmSettings(life,settings);}catch{setStatus(t("feature.editSaveError"));}},[life,settings]);
  // At rest on 0s the intro is still fading in; show its title card as the poster instead.
  useEffect(()=>{if(canvas.current)drawFilmFrame(canvas.current,life,t,settings,format,seconds===0&&!playing?Math.min(duration*.05,4):seconds,locale);},[life,t,settings,format,seconds,playing,duration,locale]);
  useEffect(()=>{
    if(!playing)return;const start=performance.now()-seconds*1000;let frame=0;
    const tick=()=>{const elapsed=(performance.now()-start)/1000;if(elapsed>=duration){setSeconds(duration);setPlaying(false);return;}setSeconds(elapsed);frame=requestAnimationFrame(tick);};
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
    // The clock is restarted only when the playback button or format changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing,format,duration]);
  // The preview plays the chosen score from the playhead, so the music is heard before export.
  useEffect(()=>{
    if(!playing||settings.music==="silent"||typeof AudioContext==="undefined")return;
    const audio=new AudioContext();let stop:(()=>void)|undefined;
    void audio.resume().then(()=>{if(audio.state==="running")stop=startFilmScore(audio,audio.destination,settings.music as Exclude<FilmSettings["music"],"silent">,life.seed,Math.max(.5,duration-seconds));}).catch(()=>{});
    return()=>{stop?.();void audio.close().catch(()=>{});};
    // Restarted when playback starts or the track changes, not on every frame of the playhead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing,settings.music,format,life.seed]);
  const change=(patch:Partial<FilmSettings>)=>setSettings(s=>({...s,...patch}));
  const record=async()=>{
    quiet.current?.abort();setPlaying(false);setProgress(0);setStatus("");const controller=new AbortController();abort.current=controller;
    try{const blob=await recordLifeFilm(life,t,settings,format,p=>{if(alive.current)setProgress(p);},controller.signal,locale);if(alive.current){setSavedVideo({blob,url:URL.createObjectURL(blob),format});setStatus("");}}
    catch(e){if(alive.current)setStatus(e instanceof DOMException&&e.name==="AbortError"?t("feature.recordCancelled"):e instanceof LifeMediaError?e.message:t("feature.recordFailed"));}
    finally{if(alive.current)setProgress(null);abort.current=null;}
  };
  const recordQuietly=()=>{
    if(savedVideo||progress!==null||quiet.current||typeof MediaRecorder==="undefined")return;
    const controller=new AbortController();quiet.current=controller;

    void recordLifeFilm(life,t,settings,format,()=>{},controller.signal,locale).then(blob=>{
      if(!alive.current||controller.signal.aborted)return;
      setSavedVideo({blob,url:URL.createObjectURL(blob),format});setStatus("");

    }).catch(()=>{})
      .finally(()=>{if(quiet.current===controller)quiet.current=null;});
  };
  const videoFile=(video:{blob:Blob;format:FilmFormat})=>new File([video.blob],`${life.id}-${video.format}.${video.blob.type.includes("mp4")?"mp4":"webm"}`,{type:video.blob.type.split(";")[0]});
  const canShareVideo=!!savedVideo&&typeof navigator!=="undefined"&&!!navigator.canShare?.({files:[videoFile(savedVideo)]});
  const shareVideo=async()=>{
    if(!savedVideo)return;
    const url=lifeShareUrl(birthInvitationUrl(locale,(life.migration?.birthCountry??life.country).id),life);
    await shareImageAction(navigator,videoFile(savedVideo),{title:settings.title||life.name,text:life.alive?settings.title||life.name:lifePost(life,locale,t),url});

  };
  const album=()=>downloadBlob(new Blob([albumDocument(life,locale,t,settings)],{type:"text/html;charset=utf-8"}),`${life.id}-illustrated-album.html`);
  const photo=async(index:number)=>{const event=selected[index];if(!event)return;const c=mediaCanvas();drawLifeCard(c,life,locale,t,settings.captions[event.id]||t(event.key,event.params),event);downloadBlob(await canvasBlob(c),`${life.id}-photo-${String(index+1).padStart(2,"0")}.png`);};
  return <div className="film-studio">
    <div className="film-preview">
      <canvas ref={canvas} width={720} height={1280} aria-label={t("feature.filmPreview")}/>
      <div className="actions"><button className="secondary" onClick={()=>{if(playing)quiet.current?.abort();else if(seconds<.5||seconds>=duration)recordQuietly();if(seconds>=duration)setSeconds(0);setPlaying(!playing);}} disabled={progress!==null}>{playing?<Square size={15}/>:<Play size={15}/>} {playing?t("pause"):t("ui.preview")}</button><span>{Math.floor(seconds)} / {duration}s</span></div>
      {/* A finished video's share and save sit right under the preview the player just watched; phones
          showed them far below the tall portrait canvas, and desktops (no file sharing) only had a quiet Save. */}
      {savedVideo&&progress===null&&<div className="film-ready"><p className="eyebrow" role="status">{t("feature.completedVideo")}</p><div className="actions">{canShareVideo&&<button className="primary" onClick={()=>void shareVideo()}><Share2 size={16}/>{viralCopy(locale).shareVideo}</button>}<button className={canShareVideo?"secondary":"primary"} onClick={()=>{downloadBlob(savedVideo.blob,videoFile(savedVideo).name);}}><Download size={16}/>{t("feature.saveVideo")}</button></div></div>}
      <input type="range" aria-label={t("feature.previewPosition")} min={0} max={duration} step={.1} value={seconds} onChange={e=>{quiet.current?.abort();setPlaying(false);setSeconds(Number(e.target.value));}}/>
      {format==="film"&&<><p className="muted">{t("feature.filmIncludesEpilogue")}</p><button className="text-button" disabled={progress!==null} onClick={()=>{setPlaying(false);setSeconds(FILM_EPILOGUE_START);}}>{t("feature.previewEpilogue")}</button></>}
      {/* Make and share sit under the preview, so phones reach them without scrolling past the editor. */}
      <div className="studio-export">
        {progress!==null?<><label>{t("feature.makingVideo",{n:Math.round(progress*100)})}<progress value={progress} max={1}/></label><p>{t("feature.recordHelp",{n:duration})}</p><button className="secondary" onClick={()=>abort.current?.abort()}>{t("feature.cancelRecording")}</button></>:savedVideo?null:<button className="primary" onClick={()=>void record()}><Download size={16}/>{t(`feature.make.${format}`)}</button>}
        <p role="status">{status}</p>
      </div>
    </div>
    <div className="film-editor">
      <p className="eyebrow">{t("feature.yourWay")}</p><h2>{t("feature.shapeFilm")}</h2>
      <fieldset disabled={progress!==null}>
      <div className="segmented" role="group" aria-label={t("feature.videoFormat")}>{(["film","teaser","epilogue"]as const).map(f=><button key={f} className={format===f?"active":""} aria-pressed={format===f} onClick={()=>{setFormat(f);setSeconds(0);setPlaying(false);}}>{t(`feature.format.${f}`)}</button>)}</div>
      <div className="studio-tabs" role="group" aria-label={t("feature.editorSections")}>{["Scenes","Words","Look & music","Photos & album"].map(name=><button key={name} aria-pressed={tab===name} className={tab===name?"active":""} onClick={()=>setTab(name)}>{t(`feature.tab.${name}`)}</button>)}</div>
      {tab==="Scenes"?<div>
        <p>{t("feature.chooseMoments",{n:selected.length})}</p>
        <div className="studio-scenes">{selected.map(e=><article key={e.id}>
          <img src={sceneDataUrl(pixelScene(life,e))} alt={t("feature.sceneAge",{age:e.age})} width={320} height={180}/>
          <div><b>{t("feature.ageYear",{age:e.age,year:e.year})}</b><textarea aria-label={t("feature.captionAge",{age:e.age,id:e.id})} value={settings.captions[e.id]??t(e.key,e.params)} maxLength={240} onChange={ev=>change({captions:{...settings.captions,[e.id]:ev.target.value}})}/></div>
          <button aria-label={t("feature.removeScene",{id:e.id})} disabled={selected.length<=1} onClick={()=>change({sceneIds:settings.sceneIds.filter(id=>id!==e.id)})}><X size={15}/></button>
        </article>)}</div>
        <details><summary>{t("feature.addMoment")}</summary><div className="scene-picker">{life.events.filter(e=>!settings.sceneIds.includes(e.id)).map(e=><button className="secondary" disabled={selected.length>=10} key={e.id} onClick={()=>change({sceneIds:[...settings.sceneIds,e.id]})}>{t("age")} {e.age} · {t(e.key,e.params)}</button>)}</div></details>
      </div>:tab==="Words"?<div className="studio-fields">
        <label>{t("ui.title")}<input value={settings.title} maxLength={80} onChange={e=>change({title:e.target.value})}/></label>
        <label>{t("feature.closingWords")}<textarea value={settings.words} maxLength={400} onChange={e=>change({words:e.target.value})} placeholder={t("feature.wordsPlaceholder")}/></label>
        <p className="muted">{t("feature.keepsakeWords")}</p>
      </div>:tab==="Look & music"?<div className="studio-fields">
        <h3>{t("feature.look")}</h3><div className="segmented">{FILM_MOODS.map(m=><button key={m} aria-pressed={settings.mood===m} className={settings.mood===m?"active":""} onClick={()=>change({mood:m})}>{t(`feature.mood.${m}`)}</button>)}</div>
        <h3>{t("music")}</h3><div className="music-options">{MUSIC_TRACKS.map(m=><button key={m} aria-pressed={settings.music===m} className={settings.music===m?"active":""} onClick={()=>change({music:m})}>{t(`feature.track.${m}`)}</button>)}</div><p className="muted">{t("feature.syntheticMusic")}</p>
      </div>:<div><h3>{t("feature.portraitPhotos")}</h3><p>{t("feature.photoSize")}</p><div className="photo-grid">{selected.map((e,i)=><button className="secondary" key={e.id} onClick={()=>void photo(i).catch(()=>setStatus(t("feature.photoError")))}><img src={sceneDataUrl(pixelScene(life,e))} alt=""/><span><Download size={13}/> {t("feature.photo",{n:i+1,age:e.age})}</span></button>)}</div><button className="primary" onClick={album}>{t("feature.downloadAlbum")}</button><p className="muted">{t("feature.albumHelp")}</p></div>}
      </fieldset>
    </div>
  </div>;
}
