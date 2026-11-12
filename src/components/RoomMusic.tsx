import {useEffect,useRef,useState} from 'react';
import type {translator} from '../lib/i18n';
const melodies:Record<string,number[]>={default:[60,64,67,72,67,64,62,67],musicBox:[72,79,76,84,79,76,74,79],waltz:[60,64,67,62,65,69,64,67,72],rainyPiano:[57,60,64,67,64,60,55,62],nightSky:[48,55,60,64,60,55,52,59],springWalk:[60,67,69,72,76,72,69,67]};
export function RoomMusic({track,t}:{track:string;t:ReturnType<typeof translator>}) {
 const [playing,setPlaying]=useState(false),[error,setError]=useState('');
 const audio=useRef<AudioContext|null>(null),generation=useRef(0);
 useEffect(()=>{
  if(!playing)return;
  const context=new AudioContext();audio.current=context;let timer:ReturnType<typeof setInterval>|undefined,index=0;const current=++generation.current;
  const stopOnHide=()=>{if(document.hidden)setPlaying(false);};document.addEventListener('visibilitychange',stopOnHide);
  void context.resume().then(()=>{
   if(generation.current!==current||context.state==='closed')return;
   const play=()=>{const notes=melodies[track]??melodies.default,note=notes[index++%notes.length];const oscillator=context.createOscillator(),gain=context.createGain();oscillator.type=track==='musicBox'?'sine':'triangle';oscillator.frequency.value=440*Math.pow(2,(note-69)/12);const now=context.currentTime;gain.gain.setValueAtTime(0,now);gain.gain.linearRampToValueAtTime(.07,now+.03);gain.gain.exponentialRampToValueAtTime(.001,now+.85);oscillator.connect(gain);gain.connect(context.destination);oscillator.start();oscillator.stop(now+.9);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};};
   play();timer=setInterval(play,track==='waltz'?400:620);
  }).catch(()=>{if(generation.current===current){setError(t("feature.musicError"));setPlaying(false);}});
  return()=>{generation.current++;if(timer)clearInterval(timer);document.removeEventListener('visibilitychange',stopOnHide);audio.current=null;if(context.state!=='closed')void context.close().catch(()=>{});};
 },[playing,track]);
 return <><button type="button" aria-pressed={playing} onClick={()=>{setError('');setPlaying(v=>!v);}}>{playing?t('feature.pauseRoomMusic'):t('feature.playRoomMusic')}</button>{error&&<span role="status">{error}</span>}</>;
}
