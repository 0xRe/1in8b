import type AgoraRTC from 'agora-rtc-sdk-ng';
import type { IAgoraRTCClient, IMicrophoneAudioTrack, IAgoraRTCRemoteUser } from 'agora-rtc-sdk-ng';
import { classifyVoiceFailure, type VoiceFailure, type VoiceStage } from './duo-voice-errors';
export type VoiceTicket={appId:string;token:string;channel:string;uid:number;peerUid:number;expiresAt:number};
export type VoiceState='off'|'connecting'|'connected'|'error';
/** One controller per room. No audio SDK code is evaluated by SSR. */
export function createDuoVoiceSession(sdk:typeof AgoraRTC, ticket:()=>Promise<VoiceTicket>,state:(value:VoiceState)=>void,peerAudio:(ready:boolean)=>void=()=>{},failure:(value:VoiceFailure)=>void=()=>{}) {
 let epoch=0;
 type Run={id:number;client?:IAgoraRTCClient;mic?:IMicrophoneAudioTrack;timer?:ReturnType<typeof setTimeout>;renewal?:Promise<void>;failed:boolean;autoplay?:()=>void;subscriptions:Map<number,Promise<void>>};
 let active:Run|undefined;
 const current=(run:Run)=>active===run&&run.id===epoch&&!run.failed;
 function releaseMicrophone(track:IMicrophoneAudioTrack|undefined){try{track?.stop();}catch{}try{track?.close();}catch{}}
 async function leaveChannel(c:IAgoraRTCClient|undefined){try{await c?.leave();}catch{/* Local shutdown must finish even if transport is gone. */}}
 async function cleanup(run:Run){clearTimeout(run.timer);run.client?.removeAllListeners();if(run.autoplay)sdk.off?.('autoplay-failed',run.autoplay);releaseMicrophone(run.mic);run.mic=undefined;await leaveChannel(run.client);}
 async function stop(){const run=active;active=undefined;const stopped=++epoch;if(run)await cleanup(run);if(epoch===stopped){peerAudio(false);state('off');}}
 async function fail(run:Run,error:unknown,stage:VoiceStage){
  if(!current(run))return;run.failed=true;
  const diagnostic=classifyVoiceFailure(error,stage,typeof navigator==='undefined'||navigator.onLine!==false);
  failure(diagnostic);peerAudio(false);
  await cleanup(run);
  if(active===run&&epoch===run.id){active=undefined;state('error');}
 }
 async function start(){
  if(active)return;const run:Run={id:++epoch,failed:false,subscriptions:new Map()};active=run;state('connecting');let stage:VoiceStage='sdk_load';
  try{
   const c=sdk.createClient({mode:'rtc',codec:'vp8'});run.client=c;
   stage='ticket';const t=await ticket();if(!current(run))return;
   const schedule=(expiresAt:number)=>{clearTimeout(run.timer);run.timer=setTimeout(()=>void renew(),Math.max(1000,Math.min(12*60_000,expiresAt-Date.now()-60_000)));};
   const renew=()=>{
    if(!current(run))return Promise.resolve();
    if(run.renewal)return run.renewal;
    run.renewal=(async()=>{try{const next=await ticket();if(!current(run))return;await c.renewToken(next.token);if(current(run))schedule(next.expiresAt);}catch(e){await fail(run,e,'renewal');}finally{run.renewal=undefined;}})();return run.renewal;
   };
   const subscribe=(user:IAgoraRTCRemoteUser)=>{
    if(!current(run)||Number(user.uid)!==t.peerUid)return Promise.resolve();
    const pending=run.subscriptions.get(t.peerUid);if(pending)return pending;
    const subscription=(async()=>{let step:VoiceStage='subscribe';try{await c.subscribe(user,'audio');if(!current(run))return;step='playback';user.audioTrack?.play();peerAudio(!!user.audioTrack);}catch(e){await fail(run,e,step);}})();
    run.subscriptions.set(t.peerUid,subscription);return subscription;
   };
   c.on('token-privilege-will-expire',renew);
   c.on('token-privilege-did-expire',()=>fail(run,{code:'TOKEN_EXPIRE'},'renewal'));
   c.on('connection-state-change',(next,previous)=>{if(next==='DISCONNECTED'&&previous!=='DISCONNECTED')void fail(run,undefined,'connection');});
   c.on('user-published',(user,kind)=>kind==='audio'?subscribe(user):Promise.resolve());
   c.on('user-unpublished',(user,kind)=>{if(current(run)&&kind==='audio'&&Number(user.uid)===t.peerUid){run.subscriptions.delete(t.peerUid);peerAudio(false);}});
   c.on('user-left',user=>{if(current(run)&&Number(user.uid)===t.peerUid){run.subscriptions.delete(t.peerUid);peerAudio(false);}});
   run.autoplay=()=>{void fail(run,undefined,'playback');};sdk.on?.('autoplay-failed',run.autoplay);
   stage='playback';await sdk.resumeAudioContext();if(!current(run))return;
   stage='microphone';const local=await sdk.createMicrophoneAudioTrack({encoderConfig:'speech_standard',AEC:true,AGC:true,ANS:true});
   if(!current(run)){releaseMicrophone(local);return;}run.mic=local;
   stage='join';await c.join(t.appId,t.channel,t.token,t.uid);
   if(!current(run)){await leaveChannel(c);return;}
   // Events are attached before join; reconcile already-publishing peers as well.
   await Promise.all((c.remoteUsers??[]).filter(user=>user.hasAudio).map(subscribe));if(!current(run))return;
   stage='publish';await c.publish(local);if(!current(run)){await leaveChannel(c);return;}state('connected');schedule(t.expiresAt);
  }catch(e){if(current(run)){await fail(run,e,stage);throw e;}}
 }
 return {start,stop,async mute(value:boolean){const run=active;if(run?.mic&&current(run))await run.mic.setMuted(value);}};
}
