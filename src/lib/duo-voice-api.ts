import { RtcTokenBuilder, RtcRole } from 'agora-token';
import { DuoError } from './duo-engine';
import { requireDuoMembership, type DuoEnv } from './duo-api';
export type DuoVoiceEnv=DuoEnv&{AGORA_APP_ID?:string;AGORA_APP_CERTIFICATE?:string};
export function voiceTicket(config:{appId:string;certificate:string},member:{channel:string;uid:number;peerUid:number},now=Date.now()){
 if(!/^[a-f0-9]{32}$/i.test(config.appId)||!/^[a-f0-9]{32}$/i.test(config.certificate))throw Error('Voice configuration unavailable');
 const ttl=900;
 return {appId:config.appId,channel:member.channel,uid:member.uid,peerUid:member.peerUid,expiresAt:now+ttl*1000,token:RtcTokenBuilder.buildTokenWithUid(config.appId,config.certificate,member.channel,member.uid,RtcRole.PUBLISHER,ttl,ttl)};
}
export async function duoVoice(request:Request,env:DuoVoiceEnv,roomId:string){
 const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 if(request.method!=='POST')return json({error:'Method not allowed'},405);
 if(request.headers.get('Origin')!==new URL(request.url).origin)return json({error:'Origin not allowed'},403);
 try{
  const member=await requireDuoMembership(request,env,roomId);
  if(!env.AGORA_APP_ID||!env.AGORA_APP_CERTIFICATE)return json({error:'Voice is temporarily unavailable. Text play is available.'},503);
  return json(voiceTicket({appId:env.AGORA_APP_ID,certificate:env.AGORA_APP_CERTIFICATE},member));
 }catch(e){
  const status=e instanceof DuoError&&Number.isInteger(e.status)&&e.status>=400&&e.status<=599?e.status:500;
  const error=status===409?'Your friend must join the room before voice can start.':status===410?'This room has ended. Start or join a new room to use voice.':status===401||status===403?'Voice authorization unavailable. Rejoin the room and try again.':'Voice is temporarily unavailable. Text play is available.';
  return json({error},status);
 }
}
