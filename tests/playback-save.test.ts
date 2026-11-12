import test from 'node:test';
import assert from 'node:assert/strict';
import {createLife, DEFAULT_SETTINGS} from '../src/game/engine';
import {decodeSave, encodeSave} from '../src/game/storage';
import {setPlayback} from '../src/game/playback';

test('paused playback and its selected speed survive backup and reload without mutating the prior save', () => {
  const life=createLife(DEFAULT_SETTINGS,1);
  const paused=setPlayback(life,{paused:true,speed:8});
  assert.equal(life.playback,undefined);
  assert.equal(setPlayback(paused,{paused:true}),paused, "repeated safety pauses must not trigger autosave loops");
  assert.deepEqual(decodeSave(encodeSave(paused,[])).life!.playback,{paused:true,speed:8});
  const resumed=setPlayback(paused,{paused:false});
  assert.deepEqual(resumed.playback,{paused:false,speed:8});
});

test('legacy saves remain loadable and malformed playback state is rejected', () => {
  const life=createLife(DEFAULT_SETTINGS,1);
  assert.equal(decodeSave(encodeSave(life,[])).life!.playback,undefined);
  for(const playback of [null,[],{paused:'yes',speed:1},{paused:true,speed:0},{paused:false,speed:24},{paused:false},{speed:4}]) {
    assert.throws(()=>decodeSave(JSON.stringify({version:1,life:{...life,playback},past:[]})));
  }
});
