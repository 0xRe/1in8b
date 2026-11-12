/** Safe, actionable voice errors without raw SDK messages, room IDs or credentials. */
export type VoiceStage = 'browser' | 'sdk_load' | 'ticket' | 'microphone' | 'join' | 'publish' | 'subscribe' | 'renewal' | 'playback' | 'connection';
export type VoiceReason = 'browser_unsupported' | 'sdk_load' | 'ticket' | 'auth' | 'peer_unavailable' | 'room_ended' | 'offline' | 'mic_permission' | 'mic_not_found' | 'mic_in_use' | 'microphone' | 'join' | 'publish' | 'subscribe' | 'renewal' | 'token_expired' | 'playback' | 'connection_ended';
export type VoiceFailure = {reason: VoiceReason; stage: VoiceStage};
export class VoiceFailureError extends Error {
 constructor(readonly failure: VoiceFailure) { super('Voice unavailable'); }
}
export function classifyVoiceFailure(error: unknown, stage: VoiceStage, online = true): VoiceFailure {
 if (error instanceof VoiceFailureError) return {...error.failure,stage:stage==='renewal'?'renewal':error.failure.stage};
 const value = error && typeof error === 'object' ? error as {name?:unknown;code?:unknown} : {};
 const code = typeof value.code === 'string' ? value.code : value.name;
 if (!online) return {reason:'offline',stage};
 if (stage === 'microphone') {
  if (code === 'NotAllowedError' || code === 'PermissionDeniedError' || code === 'PERMISSION_DENIED') return {reason:'mic_permission',stage};
  if (code === 'NotFoundError' || code === 'DevicesNotFoundError' || code === 'DEVICE_NOT_FOUND') return {reason:'mic_not_found',stage};
  if (code === 'NotReadableError' || code === 'TrackStartError' || code === 'NOT_READABLE') return {reason:'mic_in_use',stage};
 }
 if (code === 'NOT_SUPPORTED' || code === 'WEB_SECURITY_RESTRICT') return {reason:'browser_unsupported',stage};
 if (code === 'TOKEN_EXPIRE') return {reason:'token_expired',stage};
 const defaults: Record<VoiceStage,VoiceReason> = {browser:'browser_unsupported',sdk_load:'sdk_load',ticket:'ticket',microphone:'microphone',join:'join',publish:'publish',subscribe:'subscribe',renewal:'renewal',playback:'playback',connection:'connection_ended'};
 return {reason:defaults[stage],stage};
}
export function voiceTicketFailure(status:number):VoiceFailure {
 return {reason:status===409?'peer_unavailable':status===410?'room_ended':status===401||status===403?'auth':'ticket',stage:'ticket'};
}
export function voiceEnvironmentFailure(context:{secure:boolean;microphone:boolean;rtc:boolean;online:boolean}): VoiceFailure | null {
 if (!context.secure || !context.microphone || !context.rtc) return {reason:'browser_unsupported',stage:'browser'};
 return context.online ? null : {reason:'offline',stage:'browser'};
}
export function voiceFailureMessage({reason}:VoiceFailure):string {
 switch(reason){
  case 'mic_permission':return 'Allow microphone access in this site’s browser settings, then retry voice. Text play is available.';
  case 'mic_not_found':return 'No microphone was found. Connect or enable a microphone, then retry voice.';
  case 'mic_in_use':return 'The microphone could not be opened. Close other apps using it, check device settings, then retry.';
  case 'browser_unsupported':return 'Voice needs a secure browser with microphone and WebRTC support. Open this page in a supported browser; text play is available.';
  case 'offline':return 'Your device is offline. Reconnect to the internet, then retry voice.';
  case 'peer_unavailable':return 'Wait for your friend to join this room, then retry voice. You can keep playing with text.';
  case 'room_ended':return 'This room has ended. Start or join a new room to use voice.';
  case 'auth':return 'Voice room authorization ended. Rejoin the room, then retry voice.';
  case 'ticket':return 'Voice authorization is temporarily unavailable. Keep playing with text and retry shortly.';
  case 'playback':return 'Your browser could not play your friend’s audio. Retry voice and allow audio playback.';
  case 'sdk_load':return 'Voice could not load. Check your connection or site blocker settings, then retry.';
  case 'token_expired':case 'renewal':return 'Voice authorization could not be renewed. Retry voice to reconnect. Text play is available.';
  default:return 'Voice could not connect or the connection ended. Check microphone access and your connection, then retry voice.';
 }
}
