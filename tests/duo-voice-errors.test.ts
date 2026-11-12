import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyVoiceFailure, voiceTicketFailure, voiceEnvironmentFailure, voiceFailureMessage, VoiceFailureError } from '../src/lib/duo-voice-errors';

test('voice diagnostics classify explicit device failures without exposing error content',()=>{
 for(const [code,reason] of [['PERMISSION_DENIED','mic_permission'],['NotAllowedError','mic_permission'],['DEVICE_NOT_FOUND','mic_not_found'],['NotFoundError','mic_not_found'],['NOT_READABLE','mic_in_use'],['NotReadableError','mic_in_use']]){
  const result=classifyVoiceFailure({code,message:'private-room secret-token user-id'},'microphone');
  assert.deepEqual(result,{reason,stage:'microphone'});
  assert.ok(!JSON.stringify(result).includes('secret'));
  assert.ok(voiceFailureMessage(result).length>30);
 }
 assert.deepEqual(classifyVoiceFailure({code:'private-room',message:'permission denied secret'},'join'),{reason:'join',stage:'join'});
});
test('environment detection uses browser capabilities and connectivity, never browser names',()=>{
 const supported={secure:true,microphone:true,rtc:true,online:true};
 assert.equal(voiceEnvironmentFailure(supported),null);
 for(const field of ['secure','microphone','rtc'])assert.deepEqual(voiceEnvironmentFailure({...supported,[field]:false}),{reason:'browser_unsupported',stage:'browser'});
 assert.deepEqual(voiceEnvironmentFailure({...supported,online:false}),{reason:'offline',stage:'browser'});
});
test('renewal failures preserve authorization reason and distinct runtime stage',()=>{
 assert.deepEqual(classifyVoiceFailure(new VoiceFailureError({reason:'auth',stage:'ticket'}),'renewal'),{reason:'auth',stage:'renewal'});
 assert.deepEqual(classifyVoiceFailure({code:'TOKEN_EXPIRE'},'renewal'),{reason:'token_expired',stage:'renewal'});
 assert.deepEqual(classifyVoiceFailure(new Error('private network data'),'publish',false),{reason:'offline',stage:'publish'});
});

test('voice ticket statuses distinguish waiting friend from ended room and membership rejection',()=>{
 for(const [status,reason] of [[409,'peer_unavailable'],[410,'room_ended'],[401,'auth'],[403,'auth'],[503,'ticket'],[500,'ticket']] as const)assert.deepEqual(voiceTicketFailure(status),{reason,stage:'ticket'});
 assert.match(voiceFailureMessage(voiceTicketFailure(409)),/Wait for your friend to join/);
 assert.match(voiceFailureMessage(voiceTicketFailure(410)),/room has ended/);
});
