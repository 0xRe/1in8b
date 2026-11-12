import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, Info } from 'lucide-react';
import { createDuoVoiceSession, type VoiceState, type VoiceTicket } from '../lib/duo-voice';
import { classifyVoiceFailure, voiceTicketFailure, voiceEnvironmentFailure, voiceFailureMessage, VoiceFailureError, type VoiceFailure, type VoiceStage } from '../lib/duo-voice-errors';
import { PoweredByAgora } from './DuoAgora';
import { DuoTimeoutError, withDuoDeadline } from '../lib/duo-client-lifecycle';
export function DuoVoice({roomId,memberToken,onActiveChange,compact=false}:{roomId:string;memberToken:string;onActiveChange?:(active:boolean)=>void;compact?:boolean}){
 const [status,setStatus]=useState<VoiceState>('off'),[muted,setMuted]=useState(false),[error,setError]=useState('');
 const [peerReady,setPeerReady]=useState(false);
 const session=useRef<ReturnType<typeof createDuoVoiceSession>|null>(null),busy=useRef(false),generation=useRef(0);
 const cancellation=useRef<AbortController|null>(null);
 const reportActive=useRef(onActiveChange);reportActive.current=onActiveChange;
 useEffect(()=>{reportActive.current?.(status==='connecting'||status==='connected');return()=>reportActive.current?.(false);},[status]);
 useEffect(()=>{setStatus('off');setPeerReady(false);setMuted(false);setError('');busy.current=false;return()=>{generation.current++;cancellation.current?.abort();const old=session.current;session.current=null;void old?.stop();};},[roomId,memberToken]);
 async function begin(){
  if(busy.current)return;busy.current=true;const attempt=++generation.current;
  const controller = new AbortController();
  cancellation.current = controller;
  const current=()=>generation.current===attempt;
  setError('');setPeerReady(false);setStatus('connecting');
  let reported=false,stage:VoiceStage='browser';
  const report=(value:VoiceFailure)=>{if(!current()||reported)return;reported=true;setError(voiceFailureMessage(value));};
  try{
   const old=session.current;session.current=null;
   if (old) await withDuoDeadline(() => old.stop(), controller.signal);
   if(!current())return;
   const unsupported=voiceEnvironmentFailure({secure:window.isSecureContext,microphone:typeof navigator.mediaDevices?.getUserMedia==='function',rtc:typeof window.RTCPeerConnection==='function',online:navigator.onLine!==false});
   if(unsupported)throw new VoiceFailureError(unsupported);
   stage='sdk_load';const sdk=(await withDuoDeadline(() => import('agora-rtc-sdk-ng'), controller.signal)).default;
   if(!current())return;
   const loader=():Promise<VoiceTicket>=>withDuoDeadline(async signal => {
     const response = await fetch(`/api/duo/rooms/${roomId}/voice`, { method: 'POST', headers: { Authorization: `Bearer ${memberToken}` }, signal });
     if (!response.ok) throw new VoiceFailureError(voiceTicketFailure(response.status));
     return response.json();
   }, controller.signal);
   const s=createDuoVoiceSession(sdk,loader,value=>{if(current()){setStatus(value);}},value=>{if(current()){setPeerReady(value);}},report);
   session.current=s;
   stage = 'connection';
   await withDuoDeadline(() => s.start(), controller.signal, 30_000);
   if(current()) setMuted(false);
  }catch(e){
   if(current()){
     report(classifyVoiceFailure(e,stage,navigator.onLine!==false));
     if (e instanceof DuoTimeoutError) {
       setError('Voice setup took too long. Check your connection or microphone settings, then retry.');
       generation.current++;
       controller.abort();
       const old = session.current;
       session.current = null;
       void old?.stop();
       busy.current = false;
     }
     setStatus('error');
   }
  }finally{if(current())busy.current=false;}
 }
 async function leave(){generation.current++;cancellation.current?.abort();busy.current=false;const s=session.current;session.current=null;setStatus('off');setPeerReady(false);setError('');setMuted(false);await s?.stop();}
 return <section className={`duo-voice${compact?' duo-voice-compact':''}`} aria-label="Voice chat"><div><strong>{compact?'Voice':'Voice together'}</strong>{!compact&&<small>Optional · no recording by this game · <PoweredByAgora  variant="inline"/></small>}</div>
 {status==='connected'?<><button type="button" aria-label={muted?'Unmute microphone':'Mute microphone'} title={muted?'Unmute microphone':'Mute microphone'} onClick={async()=>{try{await session.current?.mute(!muted);setMuted(!muted);}catch{setError('Could not change microphone. Leave voice and try again.');}}}>{muted?<MicOff size={16}/>:<Mic size={16}/>} {!compact&&(muted?'Unmute':'Mute')}</button><button type="button" aria-label="Leave voice" title="Leave voice" onClick={()=>void leave()}><PhoneOff size={16}/>{!compact&&' Leave voice'}</button></>:<button type="button" disabled={status==='connecting'} onClick={()=>void begin()}><Mic size={16}/>{status==='connecting'?'Connecting…':status==='error'?'Retry voice':'Enable voice'}</button>}
 {status==='connecting'&&<button type="button" aria-label="Cancel voice setup" title="Cancel voice setup" onClick={()=>void leave()}><PhoneOff size={16}/></button>}
 {!compact&&status==='connected'&&<small role="status">{peerReady?'Your friend’s audio is connected.':'You’re in voice. Your friend’s audio is off or muted.'}</small>}
 {compact&&<details><summary aria-label="Voice details" title="Voice details"><Info size={16}/></summary><small>Optional · no recording by this game · <PoweredByAgora  variant="inline"/>. {status==='connected'?(peerReady?'Friend audio connected.':'Friend audio off or muted.'):'Microphone permission is requested when you enable voice.'}</small></details>}{compact&&<PoweredByAgora  variant="inline"/>}{error&&<p role="status">{error}</p>}</section>;
}
